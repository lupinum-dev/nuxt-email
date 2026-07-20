import type { ComputedStyles } from './engine/index'
import { normalizeClass } from 'vue'

/**
 * Shared class/style helpers for the Tailwind inlining paths. The render-time
 * VNode transform ({@link ./transform}), the nested primitive self-inliner
 * ({@link ./nested}), and the post-render leftover pass ({@link ./post-render})
 * all resolve class tokens against a {@link ComputedStyles} the exact same way,
 * so the resolution lives here once.
 */

/** Split a raw `class` value into non-empty tokens in author order (duplicates kept). */
export function classTokens(rawClass: unknown): string[] {
  if (rawClass == null) return []
  return normalizeClass(rawClass).split(/\s+/).filter(token => token.length > 0)
}

/**
 * Merge the inlinable declarations of an element's classes, in class order.
 * Returns kebab-case `property -> value` pairs (the shape stored on
 * {@link ComputedStyles.inlinable}); later classes overwrite earlier values
 * while keeping the first position, mirroring object-spread merge order.
 */
export function mergeInlinableStyle(tokens: string[], computed: ComputedStyles): Map<string, string> {
  const merged = new Map<string, string>()
  for (const token of tokens) {
    const declarations = computed.inlinable.get(token)
    if (!declarations) continue
    for (const [property, value] of declarations) {
      merged.set(property, value)
    }
  }
  return merged
}

/** Residual classes to keep on the element (original order), mapped ORIGINAL -> OUTPUT. */
export function residualClasses(tokens: string[], computed: ComputedStyles): string[] {
  const residual: string[] = []
  for (const token of tokens) {
    const output = computed.residualClassMap.get(token)
    if (output !== undefined) residual.push(output)
  }
  return residual
}
