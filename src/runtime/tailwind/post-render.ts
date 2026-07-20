import type { TailwindRegion } from './nested'
import { Parser } from 'htmlparser2'
import { classTokens, mergeInlinableStyle, residualClasses } from './inline-utils'
import { TailwindMissingHeadError } from './transform'

/**
 * Post-render Tailwind completion for nested-component content.
 *
 * Two things can only be finished after SSR, because they depend on classes
 * discovered while nested components rendered (which happens after both the
 * `<ETailwind>` render and the `<head>` render):
 *
 *  1. Plain HTML elements emitted inside nested components still carry raw
 *     Tailwind classes — they have no style-derivation logic, so inlining them
 *     as a precise string splice is safe. Scoped to each region's comment
 *     markers so nothing outside a Tailwind boundary is touched, and driven by
 *     htmlparser2 tag offsets so every other byte — MSO conditional comments in
 *     particular — survives untouched.
 *  2. The head `<style>` was injected with a placeholder before nested classes
 *     were known; it is now replaced with the full accumulated non-inlinable
 *     CSS. When the region needs a `<head>` and none exists, the same
 *     {@link TailwindMissingHeadError} React Email throws is raised here (after
 *     render, so nested classes are already counted — matching React's
 *     `mapReactTree`, which reaches nested classes before its own check).
 */

interface ElementHit {
  openStart: number
  openEnd: number
  classValue: string
  styleValue: string | undefined
}

/**
 * Collect every element open tag (with a `class`) inside a fragment, with byte
 * offsets. Elements inside comments — the whole `<!--[if mso]>…<![endif]-->`
 * block — never surface as open tags, so Outlook spacers are never seen here.
 */
function collectElements(fragment: string): ElementHit[] {
  const hits: ElementHit[] = []
  const parser = new Parser({
    onopentag(_name, attributes) {
      if (typeof attributes.class !== 'string' || attributes.class.length === 0) return
      hits.push({
        openStart: parser.startIndex,
        openEnd: parser.endIndex + 1,
        classValue: attributes.class,
        styleValue: typeof attributes.style === 'string' ? attributes.style : undefined,
      })
    },
  })
  parser.write(fragment)
  parser.end()
  return hits
}

/** Parse a serialized inline style into ordered kebab `property -> value` pairs. */
function parseStylePairs(style: string | undefined): [string, string][] {
  if (!style) return []
  const pairs: [string, string][] = []
  for (const part of style.split(';')) {
    const separator = part.indexOf(':')
    if (separator === -1) continue
    const property = part.slice(0, separator).trim()
    const value = part.slice(separator + 1).trim()
    if (property.length === 0) continue
    pairs.push([property, value])
  }
  return pairs
}

function serializeStyle(style: Map<string, string>): string {
  let out = ''
  for (const [property, value] of style) {
    out += `${property}:${value};`
  }
  return out
}

const CLASS_ATTRIBUTE = /\s+class\s*=\s*("[^"]*"|'[^']*')/
const STYLE_ATTRIBUTE = /\s+style\s*=\s*("[^"]*"|'[^']*')/

/** Rewrite the `class` and `style` attributes of a single, isolated open tag. */
function rewriteOpenTag(openTag: string, newClass: string | null, newStyle: string | null): string {
  let tag = newClass === null
    ? openTag.replace(CLASS_ATTRIBUTE, '')
    : openTag.replace(CLASS_ATTRIBUTE, ` class="${newClass}"`)

  if (newStyle !== null && newStyle.length > 0) {
    if (STYLE_ATTRIBUTE.test(tag)) {
      tag = tag.replace(STYLE_ATTRIBUTE, ` style="${newStyle}"`)
    }
    else {
      const closeLength = tag.endsWith('/>') ? 2 : 1
      tag = `${tag.slice(0, tag.length - closeLength)} style="${newStyle}"${tag.slice(tag.length - closeLength)}`
    }
  }

  return tag
}

/**
 * Inline the raw Tailwind classes still on plain elements inside the fragment.
 * Accumulates every class it sees into the region (so the head `<style>` is
 * complete) and returns the spliced fragment.
 */
function inlinePlainElements(fragment: string, region: TailwindRegion): string {
  const hits = collectElements(fragment)
  for (const hit of hits) {
    region.classNames.push(...classTokens(hit.classValue))
  }

  const computed = region.engine.computeStyles(region.classNames)

  interface Edit { start: number, end: number, text: string }
  const edits: Edit[] = []

  for (const hit of hits) {
    const tokens = classTokens(hit.classValue)
    const tw = mergeInlinableStyle(tokens, computed)
    const residual = residualClasses(tokens, computed)

    // Already-processed (sanitized/unknown) or non-Tailwind classes: no inline
    // styles and every token kept verbatim -> leave the tag exactly as it is.
    const classUnchanged = residual.length === tokens.length && residual.every((name, index) => name === tokens[index])
    if (tw.size === 0 && classUnchanged) continue

    const merged = new Map(tw)
    for (const [property, value] of parseStylePairs(hit.styleValue)) {
      merged.set(property, value)
    }

    const openTag = fragment.slice(hit.openStart, hit.openEnd)
    const newClass = residual.length > 0 ? residual.join(' ') : null
    const newStyle = merged.size > 0 ? serializeStyle(merged) : null
    edits.push({ start: hit.openStart, end: hit.openEnd, text: rewriteOpenTag(openTag, newClass, newStyle) })
  }

  edits.sort((left, right) => right.start - left.start)
  let out = fragment
  for (const edit of edits) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  }
  return out
}

function processRegion(html: string, region: TailwindRegion): string {
  const startComment = `<!--${region.startMarker}-->`
  const endComment = `<!--${region.endMarker}-->`
  const startIndex = html.indexOf(startComment)
  const endIndex = html.indexOf(endComment)
  if (startIndex === -1 || endIndex === -1) return html

  const fragmentStart = startIndex + startComment.length
  const fragment = html.slice(fragmentStart, endIndex)
  const inlined = inlinePlainElements(fragment, region)

  // Full non-inlinable CSS from every class seen anywhere in the region.
  const computed = region.engine.computeStyles(region.classNames)
  if (computed.nonInlinableCss !== '' && !region.hasHead) {
    throw new TailwindMissingHeadError(computed.nonInlinableClassNames)
  }

  const out = html.slice(0, startIndex) + inlined + html.slice(endIndex + endComment.length)
  return out.replace(region.placeholder, computed.nonInlinableCss)
}

/**
 * Complete every registered Tailwind region. A no-op (byte-identical passthrough)
 * when no region was registered — the zero-cost guarantee for emails that do not
 * use `<ETailwind>`.
 */
export function applyTailwindPostRender(html: string, regions: TailwindRegion[] | undefined): string {
  if (!regions || regions.length === 0) return html
  let result = html
  for (const region of regions) {
    result = processRegion(result, region)
  }
  return result
}
