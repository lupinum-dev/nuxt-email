import { find, type Rule } from '../../css-tree'

/** A rule with a pseudo-class or pseudo-element applies only in that state, so it cannot be inlined. */
export function isRuleInlinable(rule: Rule): boolean {
  return find(rule.prelude, node => node.type === 'PseudoClassSelector' || node.type === 'PseudoElementSelector') === null
}
