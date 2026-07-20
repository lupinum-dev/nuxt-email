import type { TailwindEngine } from './engine/index'
import type { InjectionKey } from 'vue'
import { camelize, normalizeClass } from 'vue'
import { normalizeEmailStyle } from '../components/style'
import { classTokens, mergeInlinableStyle, residualClasses } from './inline-utils'

/**
 * Nested-component Tailwind support.
 *
 * The primary path — the render-time VNode transform in {@link ./transform} —
 * only sees the vnodes visible at the `<ETailwind>` slot boundary; classes
 * emitted *inside* a nested user component never reach it (those vnodes only
 * exist once Vue renders the component during SSR, after the transform ran).
 * React Email's `mapReactTree` reaches them by re-invoking child components; a
 * Vue component cannot be safely re-invoked out of band, so instead:
 *
 *  1. Every E* primitive with style-derivation logic (Text margins, Section /
 *     Container td-padding split, Button MSO spacer derivation, Link/Img/Hr
 *     defaults) *self-inlines*: when this context is injected and the primitive
 *     still carries raw class tokens (i.e. the transform never touched it), it
 *     resolves those tokens through the engine and feeds `{ ...tailwind, ...author }`
 *     into its own style logic before rendering — see {@link resolveNestedTailwindStyle}.
 *  2. Plain HTML elements emitted inside nested components have no derivation
 *     logic, so they are inlined post-render by {@link ./post-render}.
 *
 * Elements the transform already processed carry no raw class (it strips fully
 * inlined classes and sanitizes residuals), so self-inlining them is a no-op —
 * that is the double-processing guard.
 */

/**
 * A region of accumulated Tailwind state for one `<ETailwind>` boundary. Created
 * during the boundary's render, registered on the per-render context, and
 * consumed by the post-render pass. `classNames` is mutated in place as nested
 * primitives (and later the leftover pass) discover classes, so the head `<style>`
 * — injected before the body renders — can be completed with the full set.
 */
export interface TailwindRegion {
  readonly id: string
  readonly engine: TailwindEngine
  /** Every class token seen in the region, in discovery order (duplicates kept). */
  readonly classNames: string[]
  /** Whether a `<head>` exists in the slot-visible subtree (where a `<style>` can go). */
  readonly hasHead: boolean
  /** Unique token injected into the head `<style>` body, replaced post-render. */
  readonly placeholder: string
  /** Comment marker content wrapping the region output (splice scope for the leftover pass). */
  readonly startMarker: string
  readonly endMarker: string
}

/**
 * Provided by `<ETailwind>` to its subtree. The engine and region are filled in
 * during setup/render; primitives read them at their own render time (always
 * after the boundary's render has populated the holder).
 */
export interface NestedTailwindHolder {
  engine: TailwindEngine | null
  region: TailwindRegion | null
}

export const TAILWIND_NESTED_KEY: InjectionKey<NestedTailwindHolder> = Symbol('nuxt-email:tailwind-nested')

let regionCounter = 0

/** Create a region with a document-unique id for its markers and style placeholder. */
export function createTailwindRegion(
  engine: TailwindEngine,
  classNames: string[],
  hasHead: boolean,
): TailwindRegion {
  const id = `${(regionCounter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  return {
    id,
    engine,
    classNames,
    hasHead,
    placeholder: `/*nuxt-email-tw-css:${id}*/`,
    startMarker: `nuxt-email-tw:${id}`,
    endMarker: `/nuxt-email-tw:${id}`,
  }
}

export interface NestedResolution {
  /** Effective style input for the primitive's own style logic. */
  style: unknown
  /** True only when a class or style actually changed (keeps the inactive path byte-identical). */
  changed: boolean
}

/**
 * Resolve a primitive's raw class tokens against the injected engine and return
 * the merged `{ ...tailwind, ...author }` style to feed into the primitive's own
 * derivation. Mutates `attributes.class` in place to the residual classes (or
 * removes it) — but ONLY when something actually changes, so a primitive outside
 * a Tailwind region, or one already processed by the transform, is untouched.
 */
export function resolveNestedTailwindStyle(
  holder: NestedTailwindHolder | null,
  attributes: Record<string, unknown>,
  styleValue: unknown,
): NestedResolution {
  if (!holder || !holder.engine || !holder.region) {
    return { style: styleValue, changed: false }
  }

  const tokens = classTokens(attributes.class)
  if (tokens.length === 0) {
    return { style: styleValue, changed: false }
  }

  holder.region.classNames.push(...tokens)
  const computed = holder.engine.computeStyles(tokens)
  const tw = mergeInlinableStyle(tokens, computed)
  const residual = residualClasses(tokens, computed)

  // No inlinable declarations and every token kept verbatim (unknown, non-Tailwind
  // class): nothing to do, leave the element exactly as authored.
  const classUnchanged = residual.length === tokens.length && residual.every((name, index) => name === tokens[index])
  if (tw.size === 0 && classUnchanged) {
    return { style: styleValue, changed: false }
  }

  if (residual.length > 0) {
    attributes.class = normalizeClass(residual.join(' '))
  }
  else {
    delete attributes.class
  }

  if (tw.size === 0) {
    return { style: styleValue, changed: true }
  }

  const tailwindStyle: Record<string, string> = {}
  for (const [property, value] of tw) {
    tailwindStyle[camelize(property)] = value
  }
  const author = normalizeEmailStyle(styleValue)
  return { style: { ...tailwindStyle, ...(author ?? {}) }, changed: true }
}
