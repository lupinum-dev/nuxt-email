import { type CssNode, string, walk } from '../../css-tree'
import { sanitizeClassName } from '../compatibility/sanitize-class-name'
import { isRuleInlinable } from './is-rule-inlinable'
import { NON_INLINABLE_ATRULES } from './constants'
import { stripEmptyTailwindVars } from './strip-empty-tailwind-vars'

/**
 * This function goes through a few steps to ensure the best email client support and
 * to ensure that media queries and pseudo classes are applied correctly alongside
 * the inline styles.
 *
 * What it does:
 * 1. Converts all declarations in all rules into important ones
 * 2. Sanitizes class selectors of all non-inlinable rules
 * 3. Removes --tw-* custom property declarations — by this point all CSS
 *    variables have been resolved, so these are dead weight in email HTML.
 * 4. Strips empty-fallback var(--tw-*,) refs that Tailwind v4 emits for
 *    variant-stacking idioms (filter, font-variant-numeric, etc.) — email
 *    clients can't resolve CSS custom properties reliably, so any --tw-*
 *    left as a bare empty-fallback ref would reach the client broken.
 */
export function sanitizeNonInlinableRules(node: CssNode): void {
  let conditionalDepth = 0
  walk(node, {
    enter(rule: CssNode) {
      if (rule.type === 'Atrule' && NON_INLINABLE_ATRULES.has(rule.name.toLowerCase())) conditionalDepth++
      if (rule.type === 'Rule' && (conditionalDepth > 0 || !isRuleInlinable(rule))) {
        walk(rule.prelude, (node) => {
          if (node.type === 'ClassSelector') {
            const unescapedClassName = string.decode(node.name)
            node.name = sanitizeClassName(unescapedClassName)
          }
        })

        walk(rule, {
          visit: 'Declaration',
          enter(declaration, item, list) {
            if (declaration.property.startsWith('--tw-')) {
              list.remove(item)
              return
            }

            declaration.important = true
            stripEmptyTailwindVars(declaration.value)
          },
        })
      }
    },
    leave(rule: CssNode) {
      if (rule.type === 'Atrule' && NON_INLINABLE_ATRULES.has(rule.name.toLowerCase())) conditionalDepth--
    },
  })
}
