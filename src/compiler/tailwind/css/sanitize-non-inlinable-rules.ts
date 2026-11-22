import { type CssNode, type List, type ListItem, string, walk } from '../../css-tree'
import { sanitizeClassName } from '../compatibility/sanitize-class-name'

/**
 * Prepare one `<head>` rule (a non-inlinable rule, possibly inside its media
 * queries) so it applies next to the inline styles in email clients:
 * 1. Sanitizes its class selectors, matching the residual class on the element
 * 2. Marks every declaration `!important`, so it beats the inline style
 * 3. Removes --tw-* custom property declarations — by this point all CSS
 *    variables have been resolved, so these are dead weight in email HTML —
 *    and the rules and at-rules that are empty afterwards
 * 4. Writes a selector that is one `:where(X)` or `:is(X)` as `X`. Every head
 *    declaration is `!important`, so the specificity they change does not matter,
 *    and some email clients drop a rule with these functions.
 */
export function sanitizeNonInlinableRules(node: CssNode): void {
  walk(node, {
    enter(child: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
      if (child.type === 'Selector') {
        const only = child.children.first
        if (child.children.size === 1 && only?.type === 'PseudoClassSelector' && /^(?:where|is)$/i.test(only.name)
          && only.children?.first?.type === 'SelectorList' && only.children.first.children.size === 1) {
          const inner = only.children.first.children.first
          if (inner?.type === 'Selector') child.children = inner.children
        }
      }
      // The condition of `@supports (display:grid)` is a declaration too; it must stay as written.
      if (child.type === 'AtrulePrelude') return walk.skip
      if (child.type === 'ClassSelector') child.name = sanitizeClassName(string.decode(child.name))
      if (child.type !== 'Declaration') return
      if (child.property.startsWith('--tw-')) list.remove(item)
      else child.important = true
    },
    leave(child: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
      if ((child.type === 'Rule' || child.type === 'Atrule') && child.block?.children.isEmpty) list.remove(item)
    },
  })
}
