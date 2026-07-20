import type { StyleSheet } from 'css-tree'
import { resolveAllCssVariables } from './css/resolve-all-css-variables'
import { resolveCalcExpressions } from './css/resolve-calc-expressions'
import { sanitizeDeclarations } from './css/sanitize-declarations'

/**
 * Normalize a compiled Tailwind stylesheet for email:
 * resolve CSS custom properties, evaluate the `*`/`/` calc expressions Tailwind
 * v4 emits, then rewrite declarations into email-client-safe forms
 * (rgb/oklch/hex normalization, logical-shorthand splitting, …).
 *
 * Mutates the stylesheet in place.
 */
export function sanitizeStyleSheet(styleSheet: StyleSheet): void {
  resolveAllCssVariables(styleSheet)
  resolveCalcExpressions(styleSheet)
  sanitizeDeclarations(styleSheet)
}
