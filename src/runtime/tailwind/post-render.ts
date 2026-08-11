import type { TailwindRegion } from './nested'
import type { CssNode } from 'css-tree'
import { generate, parse, walk } from 'css-tree'
import { Parser } from 'htmlparser2'
import { classTokens, mergeInlinableStyle, residualClasses } from './inline-utils'
import { TailwindMissingHeadError } from './errors'

/**
 * Post-render Tailwind completion for nested-component content.
 *
 * Two things can only be finished after SSR, because Vue must render user
 * components exactly once before their native/structural output is known:
 *
 *  1. Native and structural elements still carry raw Tailwind classes — they
 *     have no style-derivation logic, so inlining them
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
function parseStylePairs(style: string | undefined): [string, string][] | null {
  if (!style) return []
  const pairs: [string, string][] = []
  try {
    const declarations = parse(style, { context: 'declarationList' }) as CssNode
    walk(declarations, {
      visit: 'Declaration',
      enter(declaration) {
        pairs.push([
          declaration.property,
          generate(declaration.value).trim() + (declaration.important ? '!important' : ''),
        ])
      },
    })
  }
  catch {
    return null
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

function escapeAttributeValue(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

/** Rewrite the `class` and `style` attributes of a single, isolated open tag. */
function rewriteOpenTag(openTag: string, newClass: string | null, newStyle: string | null): string {
  let tag = newClass === null
    ? openTag.replace(CLASS_ATTRIBUTE, '')
    : openTag.replace(CLASS_ATTRIBUTE, ` class="${escapeAttributeValue(newClass)}"`)

  if (newStyle !== null && newStyle.length > 0) {
    const escapedStyle = escapeAttributeValue(newStyle)
    if (STYLE_ATTRIBUTE.test(tag)) {
      tag = tag.replace(STYLE_ATTRIBUTE, ` style="${escapedStyle}"`)
    }
    else {
      const closeLength = tag.endsWith('/>') ? 2 : 1
      tag = `${tag.slice(0, tag.length - closeLength)} style="${escapedStyle}"${tag.slice(tag.length - closeLength)}`
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

    const authorStyles = parseStylePairs(hit.styleValue)
    const merged = new Map(tw)
    if (authorStyles !== null) {
      for (const [property, value] of authorStyles) {
        merged.set(property, value)
      }
    }

    const openTag = fragment.slice(hit.openStart, hit.openEnd)
    const newClass = residual.length > 0 ? residual.join(' ') : null
    const newStyle = authorStyles === null
      ? `${serializeStyle(merged)}${hit.styleValue ?? ''}`
      : (merged.size > 0 ? serializeStyle(merged) : null)
    edits.push({ start: hit.openStart, end: hit.openEnd, text: rewriteOpenTag(openTag, newClass, newStyle) })
  }

  edits.sort((left, right) => right.start - left.start)
  let out = fragment
  for (const edit of edits) {
    out = out.slice(0, edit.start) + edit.text + out.slice(edit.end)
  }
  return out
}

function insertStyleIntoHead(html: string, css: string): string | null {
  let depth = 0
  let headDepth: number | undefined
  let headCloseStart: number | undefined
  let firstDirectStyleStart: number | undefined
  const parser = new Parser({
    onopentag(name) {
      if (headDepth === undefined && name === 'head') {
        headDepth = depth
      }
      else if (
        headDepth !== undefined
        && headCloseStart === undefined
        && depth === headDepth + 1
        && name === 'style'
        && firstDirectStyleStart === undefined
      ) {
        firstDirectStyleStart = parser.startIndex
      }
      depth += 1
    },
    onclosetag(name) {
      depth = Math.max(0, depth - 1)
      if (name === 'head' && headDepth === depth && headCloseStart === undefined) {
        headCloseStart = parser.startIndex
      }
    },
  })
  parser.write(html)
  parser.end()

  const insertionIndex = firstDirectStyleStart ?? headCloseStart
  if (insertionIndex === undefined) return null

  const style = `<style>${css}</style>`
  return html.slice(0, insertionIndex) + style + html.slice(insertionIndex)
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
  if (inlined.includes(region.placeholder)) {
    const completed = inlined.replace(region.placeholder, computed.nonInlinableCss)
    return html.slice(0, startIndex) + completed + html.slice(endIndex + endComment.length)
  }

  const withHeadStyle = insertStyleIntoHead(inlined, computed.nonInlinableCss)
  if (withHeadStyle !== null) {
    return html.slice(0, startIndex) + withHeadStyle + html.slice(endIndex + endComment.length)
  }

  if (computed.nonInlinableCss !== '') {
    throw new TailwindMissingHeadError(computed.nonInlinableClassNames)
  }

  return html.slice(0, startIndex) + inlined + html.slice(endIndex + endComment.length)
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
