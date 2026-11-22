import { type Atrule, clone, type CssNode, generate, List, parse, type Rule, string, walk } from '../../css-tree'
import { NON_INLINABLE_ATRULES } from './constants'
import { isRuleInlinable } from './is-rule-inlinable'

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

const MEDIA_TYPE = /^(?:only\s+)?[a-z]/i

/** The condition of two nested `@media` queries as one, or `undefined` when they cannot be joined. */
function joinMedia(outer: string, inner: string): string | undefined {
  if ([outer, inner].some(query => query === '' || query.includes(',') || /^not\s/i.test(query))) return undefined
  // A media type such as `print` must come first, and a query has only one.
  if (MEDIA_TYPE.test(inner)) return MEDIA_TYPE.test(outer) ? undefined : `${inner} and ${outer}`
  return `${outer} and ${inner}`
}

/**
 * Join consecutive `@media` wrappers into one condition (`sm:hover:` gives
 * `(min-width:640px) and (hover:hover)`): email clients read a nested at-rule poorly.
 */
function mergeMediaWrappers(atRules: readonly Atrule[]): Pick<Atrule, 'name' | 'prelude'>[] {
  const merged: Pick<Atrule, 'name' | 'prelude'>[] = []
  for (const atRule of atRules) {
    const previous = merged.at(-1)
    if (previous?.prelude && atRule.prelude && previous.name.toLowerCase() === 'media' && atRule.name.toLowerCase() === 'media') {
      const joined = joinMedia(generate(previous.prelude), generate(atRule.prelude))
      if (joined !== undefined) {
        previous.prelude = parse(joined, { context: 'atrulePrelude', atrule: 'media' }) as Atrule['prelude']
        continue
      }
    }
    merged.push({ name: atRule.name, prelude: atRule.prelude ? clone(atRule.prelude) as Atrule['prelude'] : null })
  }
  return merged
}

interface ExtractedRules {
  inlinable: Map<string, Rule[]>
  /** Non-inlinable rules inside clones of their enclosing conditional at-rules. */
  nonInlinable: Map<string, CssNode[]>
  /** Canonical non-inlinable rules, once each and in stylesheet order. */
  orderedNonInlinable: CssNode[]
  /** Requested classes in the order of their first rule in the stylesheet. */
  stylesheetOrder: string[]
}

/**
 * Without `classes`, every class that owns a rule is requested, except in an at-rule
 * that cannot be written to an email: such a rule fails only for a class that is asked for.
 */
export function extractRulesPerClass(
  root: CssNode,
  classes?: string[],
): ExtractedRules {
  const classSet = classes === undefined ? undefined : new Set(classes)
  const isRequested = (className: string) => classSet === undefined || classSet.has(className)

  // A class can be defined by multiple rules (e.g. a preset and a child config
  // override), so keep them all to merge instead of the last one clobbering.
  const inlinableRules = new Map<string, Rule[]>()
  const nonInlinableRules = new Map<string, CssNode[]>()
  const orderedNonInlinableRules: CssNode[] = []
  const stylesheetOrder = new Set<string>()

  const appendRule = <Node extends CssNode>(
    map: Map<string, Node[]>,
    className: string,
    rule: Node,
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
      if (unsupported) {
        if (classSet === undefined) return
        if (selectorClasses.some(isRequested)) {
          throw new TypeError(`Unable to render Tailwind CSS: @${unsupported.name} rules are not supported.`)
        }
      }
    }
    const inlinable = enclosingAtRules.length === 0 && isRuleInlinable(rule)
    // A conditional rule keeps its at-rules, so it can be written to <head> on its own.
    let node: CssNode = rule
    if (!inlinable) {
      node = clone(rule)
      for (const atRule of mergeMediaWrappers(enclosingAtRules).reverse()) {
        node = {
          type: 'Atrule',
          name: atRule.name,
          prelude: atRule.prelude,
          block: { type: 'Block', children: new List<CssNode>().fromArray([node]) },
        }
      }
    }
    let includesRequestedClass = false
    for (const className of selectorClasses) {
      if (!isRequested(className)) continue
      includesRequestedClass = true
      stylesheetOrder.add(className)
      if (inlinable) appendRule(inlinableRules, className, rule)
      else appendRule(nonInlinableRules, className, node)
    }
    if (includesRequestedClass && !inlinable) orderedNonInlinableRules.push(node)
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
    stylesheetOrder: [...stylesheetOrder],
  }
}
