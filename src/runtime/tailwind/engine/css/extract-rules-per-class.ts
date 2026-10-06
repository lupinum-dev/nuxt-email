import { type Atrule, clone, type CssNode, List, type Rule, string, walk } from '../../css-tree'
import { NON_INLINABLE_ATRULES } from './constants'
import { isRuleInlinable } from './is-rule-inlinable'
import { splitMixedRule } from './split-mixed-rule'

// Selector functions whose arguments can name the class that owns a rule. A class
// inside :not() or :has() is a condition on another element, never the owner.
const OWNER_FUNCTIONS = new Set(['is', 'where', 'matches'])
const SELECTOR_FUNCTIONS = new Set([...OWNER_FUNCTIONS, 'not', 'has'])

// Tailwind builds an arbitrary variant such as `[:not(&)]:bg-red-500` by putting the
// utility's own class where `&` stands. That class names the same functions it sits in,
// so it owns the rule even inside :not() or :has(); any other class there is a condition.
function isOwnArbitraryVariant(className: string, functions: string[]): boolean {
  return className.includes('&') && functions
    .filter(name => !OWNER_FUNCTIONS.has(name))
    .every(name => className.toLowerCase().includes(`:${name}(`))
}

export interface ExtractedRules {
  inlinable: Map<string, Rule[]>
  nonInlinable: Map<string, Rule[]>
  /** Canonical non-inlinable rules, once each and in stylesheet order. */
  orderedNonInlinable: Rule[]
}

export function extractRulesPerClass(
  root: CssNode,
  classes: string[],
): ExtractedRules {
  const classSet = new Set(classes)

  // A class can be defined by multiple rules (e.g. a preset and a child config
  // override), so keep them all to merge instead of the last one clobbering.
  const inlinableRules = new Map<string, Rule[]>()
  const nonInlinableRules = new Map<string, Rule[]>()
  const orderedNonInlinableRules: Rule[] = []

  const appendRule = (
    map: Map<string, Rule[]>,
    className: string,
    rule: Rule,
  ) => {
    const existing = map.get(className)
    if (existing) {
      existing.push(rule)
    }
    else {
      map.set(className, [rule])
    }
  }

  const enclosingAtRules: Atrule[] = []
  const handleRule = (rule: Rule) => {
    // A nested rule (e.g. group/peer's `&:is(:where(.group):hover *)`) belongs
    // to its parent utility; processing it standalone emits a bare, parentless
    // `&` rule into the <style> block, so skip it here.
    const firstSelector
      = rule.prelude.type === 'SelectorList'
        ? rule.prelude.children.first
        : null
    if (
      firstSelector?.type === 'Selector'
      && firstSelector.children.first?.type === 'NestingSelector'
    ) {
      return
    }

    // Only the prelude names the class that owns the rule; classes referenced
    // inside the block (e.g. `.group` in `:where(.group)`) must not key it.
    const selectorClasses: string[] = []
    if (rule.prelude.type === 'SelectorList') {
      rule.prelude.children.forEach((selector) => {
        const owners: string[] = []
        const collect = (insideFunctions: boolean) => {
          // Selector functions around the current node, innermost last.
          const functions: string[] = []
          walk(selector, {
            enter(node: CssNode) {
              if (node.type === 'PseudoElementSelector') return walk.skip
              if (node.type === 'PseudoClassSelector') {
                const name = node.name.toLowerCase()
                if (!insideFunctions || !SELECTOR_FUNCTIONS.has(name)) return walk.skip
                functions.push(name)
              }
              if (node.type === 'ClassSelector') {
                const className = string.decode(node.name)
                if (functions.every(name => OWNER_FUNCTIONS.has(name)) || isOwnArbitraryVariant(className, functions)) owners.push(className)
              }
            },
            leave(node: CssNode) {
              if (node.type === 'PseudoClassSelector' && insideFunctions && SELECTOR_FUNCTIONS.has(node.name.toLowerCase())) functions.pop()
            },
          })
        }
        collect(false)
        // Some variants put their owning class inside a selector function:
        // child variants use :is(), arbitrary variants such as [:where(&)] use
        // any of them. Group/peer variants have a direct owner, so their
        // condition markers inside :is(:where(.group)…) never key the rule.
        if (!owners.length) collect(true)
        selectorClasses.push(...owners)
      })
    }
    if (enclosingAtRules.length > 0) {
      const unsupported = enclosingAtRules.find(atRule => !NON_INLINABLE_ATRULES.has(atRule.name.toLowerCase()))
      if (unsupported && selectorClasses.some(className => classSet.has(className))) {
        throw new TypeError(`Unable to render Tailwind CSS: @${unsupported.name} rules are not supported.`)
      }
      // Tailwind 4.3.3 wraps variant rules in conditional at-rules. Restore
      // the nested shape expected by the existing email downlevel pass.
      const conditional = clone(rule) as Rule
      for (const atRule of [...enclosingAtRules].reverse()) {
        conditional.block.children = new List<CssNode>().fromArray([{
          type: 'Atrule',
          name: atRule.name,
          prelude: atRule.prelude ? clone(atRule.prelude) as Atrule['prelude'] : null,
          block: { type: 'Block', children: conditional.block.children },
        }])
      }
      let includesRequestedClass = false
      for (const className of selectorClasses) {
        if (!classSet.has(className)) continue
        includesRequestedClass = true
        appendRule(nonInlinableRules, className, conditional)
      }
      if (includesRequestedClass) orderedNonInlinableRules.push(conditional)
      return
    }
    if (isRuleInlinable(rule)) {
      for (const className of selectorClasses) {
        if (classSet.has(className)) {
          appendRule(inlinableRules, className, rule)
        }
      }
    }
    else {
      const { inlinablePart, nonInlinablePart } = splitMixedRule(rule)
      let includesRequestedClass = false
      for (const className of selectorClasses) {
        if (!classSet.has(className)) continue
        includesRequestedClass = true
        if (inlinablePart) {
          appendRule(inlinableRules, className, inlinablePart)
        }
        if (nonInlinablePart) {
          appendRule(nonInlinableRules, className, nonInlinablePart)
        }
      }
      if (includesRequestedClass && nonInlinablePart) {
        orderedNonInlinableRules.push(nonInlinablePart)
      }
    }
  }

  walk(root, {
    enter(node: CssNode) {
      // Layers group generated rules without a condition. Every other wrapper
      // must be preserved or rejected; dropping one would make styles unconditional.
      if (node.type === 'Atrule' && node.name.toLowerCase() !== 'layer') enclosingAtRules.push(node)
      else if (node.type === 'Rule') handleRule(node)
    },
    leave(node: CssNode) {
      if (node.type === 'Atrule' && node.name.toLowerCase() !== 'layer') enclosingAtRules.pop()
    },
  })
  return {
    inlinable: inlinableRules,
    nonInlinable: nonInlinableRules,
    orderedNonInlinable: orderedNonInlinableRules,
  }
}
