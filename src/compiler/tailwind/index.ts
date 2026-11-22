import {
  type Atrule,
  clone,
  type CssNode,
  generate,
  List,
  type StyleSheet,
  walk,
} from '../css-tree'
import { extractRulesPerClass } from './css/extract-rules-per-class'
import { makeInlineStylesFor } from './css/make-inline-styles-for'
import { sanitizeClassName } from './compatibility/sanitize-class-name'
import { sanitizeNonInlinableRules } from './css/sanitize-non-inlinable-rules'
import { sanitizeStyleSheet } from './sanitize-stylesheet'
import { setupTailwind } from './setup-tailwind'

/** One class's inline declarations, kebab-case, in stylesheet order. */
type InlineStyleMap = Map<string, string>

export interface TailwindEngineOptions {
  /** Unlayered CSS for every email, such as the content of `app/emails/tailwind.css`. */
  css?: string
}

export interface ComputedStyles {
  /**
   * Per-class inline styles. Only classes that produced at least one inlinable
   * declaration appear here. Keyed by the ORIGINAL (unsanitized) class name.
   */
  inlinable: Map<string, InlineStyleMap>
  /**
   * Classes that must REMAIN on the element, mapped ORIGINAL -> OUTPUT:
   *   - a non-inlinable class maps to its sanitized selector name
   *     (matching the selectors emitted in {@link headRules});
   *   - an unknown class (no Tailwind rule at all) maps to itself.
   * A class that only produced inlinable styles is absent — the consumer drops
   * it from the `class` attribute. Adapted from React Email's residual-class logic
   * in `clone-element-with-inlined-styles.ts`.
   */
  residualClassMap: Map<string, string>
  /**
   * Original (unsanitized) names of classes that need the generated `<head>`
   * CSS: non-inlinable rules and animation declarations with referenced
   * keyframes. It cannot be reconstructed from {@link residualClassMap}, because
   * an animation declaration itself can still be inlined.
   */
  headClasses: ReadonlySet<string>
  /**
   * The `<head>` CSS: media-query and pseudo-class rules, unnested, with class
   * selectors sanitized, then referenced keyframes.
   * One entry per emitted rule, each with the original class names that need it,
   * so a render writes only the rules of the classes it used.
   */
  headRules: HeadRule[]
  /** Classes with at least one rule, in the order of their first rule in the stylesheet. */
  stylesheetOrder: string[]
}

interface HeadRule {
  classes: string[]
  css: string
}

interface TailwindEngine {
  /**
   * Compute inline styles, head rules and residual classes for every candidate
   * class of an email directory, and for the classes that the email CSS adds
   * with `@source inline()`.
   *
   * Call it once per engine with the full class list. The underlying compiler
   * only accumulates candidates, and each call re-parses a fresh stylesheet AST,
   * so repeated calls never cross-contaminate, but a call only "sees" classes in
   * its own argument.
   */
  computeStyles: (classNames: string[]) => ComputedStyles
}

interface KeyframesDefinition {
  name: string
  node: Atrule
}

function collectKeyframesDefinitions(styleSheet: StyleSheet): KeyframesDefinition[] {
  const definitions: KeyframesDefinition[] = []

  styleSheet.children.forEach((node) => {
    if (
      node.type === 'Atrule'
      && (node.name === 'keyframes' || node.name === '-webkit-keyframes')
      && node.prelude
    ) {
      definitions.push({ name: generate(node.prelude).trim(), node })
    }
  })

  return definitions
}

function collectReferencedKeyframes(
  rulesByClass: Map<string, CssNode[]>,
  knownNames: Set<string>,
): Map<string, Set<string>> {
  const references = new Map<string, Set<string>>()

  for (const [className, rules] of rulesByClass) {
    const classReferences = new Set<string>()
    for (const rule of rules) {
      walk(rule, {
        visit: 'Declaration',
        enter(declaration) {
          if (
            declaration.property !== 'animation'
            && declaration.property !== 'animation-name'
          ) return

          walk(declaration.value, (node) => {
            const name = node.type === 'Identifier'
              ? node.name
              : node.type === 'String'
                ? node.value
                : null
            if (name && knownNames.has(name)) classReferences.add(name)
          })
        },
      })
    }
    if (classReferences.size > 0) references.set(className, classReferences)
  }

  return references
}

function generateHeadCss(nodes: CssNode[], sanitize: boolean): string {
  const styleSheet: StyleSheet = {
    type: 'StyleSheet',
    children: new List<CssNode>().fromArray(nodes.map(node => clone(node))),
  }
  if (sanitize) sanitizeNonInlinableRules(styleSheet)
  return styleSheet.children.isEmpty ? '' : generate(styleSheet)
}

/**
 * Sanitize one rule at a time on clones, so each rule can be emitted
 * only when a render uses its class. Keyframes are not sanitized.
 */
function splitHeadRules(
  orderedRules: CssNode[],
  rulesByClass: Map<string, CssNode[]>,
  keyframes: KeyframesDefinition[],
  animationReferences: Map<string, Set<string>>,
): HeadRule[] {
  const owners = new Map<CssNode, string[]>()
  for (const [className, rules] of rulesByClass) {
    for (const rule of rules) {
      const classes = owners.get(rule)
      if (classes) classes.push(className)
      else owners.set(rule, [className])
    }
  }
  const headRules: HeadRule[] = orderedRules.map(rule => ({
    classes: owners.get(rule) ?? [],
    css: generateHeadCss([rule], true),
  }))
  for (const definition of keyframes) {
    const classes = [...animationReferences]
      .filter(([, names]) => names.has(definition.name))
      .map(([className]) => className)
    headRules.push({ classes, css: generateHeadCss([definition.node], false) })
  }
  return headRules.filter(rule => rule.css !== '')
}

/**
 * Build-time Tailwind engine. Follows the CSS pipeline of React Email's
 * `<Tailwind>` component (`tailwind.tsx`): the compiler passes every candidate
 * class to {@link TailwindEngine.computeStyles} and turns the result into the
 * style table.
 */
export async function createTailwindEngine(
  options: TailwindEngineOptions = {},
): Promise<TailwindEngine> {
  const build = await setupTailwind(options.css)
  // Classes that Tailwind builds without a candidate: `@source inline()` in the email CSS
  // (Tailwind expands its braces) and plain rules written there.
  const sourceClasses = options.css === undefined
    ? []
    : extractRulesPerClass(sanitizeStyleSheet(build([]))).stylesheetOrder

  const computeStyles = (candidates: string[]): ComputedStyles => {
    const classNames = [...new Set([...candidates, ...sourceClasses])]
    const styleSheet = sanitizeStyleSheet(build(classNames))

    const {
      inlinable: inlinableRules,
      nonInlinable: nonInlinableRules,
      orderedNonInlinable,
      stylesheetOrder,
    }
      = extractRulesPerClass(styleSheet, classNames)

    const keyframesDefinitions = collectKeyframesDefinitions(styleSheet)
    const knownKeyframeNames = new Set(
      keyframesDefinitions.map(definition => definition.name),
    )
    const animationReferences = new Map<string, Set<string>>()
    for (const rules of [inlinableRules, nonInlinableRules]) {
      for (const [className, names] of collectReferencedKeyframes(
        rules,
        knownKeyframeNames,
      )) {
        const existing = animationReferences.get(className) ?? new Set<string>()
        for (const name of names) existing.add(name)
        animationReferences.set(className, existing)
      }
    }
    const referencedKeyframeNames = new Set(
      Array.from(animationReferences.values()).flatMap(names => [...names]),
    )

    // Per-class inline declarations.
    const inlinable = new Map<string, InlineStyleMap>()
    for (const [className, rules] of inlinableRules) {
      inlinable.set(className, makeInlineStylesFor(rules))
    }

    // Residual classes, in first-seen order, deduplicated.
    const residualClassMap = new Map<string, string>()
    for (const className of classNames) {
      if (residualClassMap.has(className)) continue
      if (nonInlinableRules.has(className)) {
        residualClassMap.set(className, sanitizeClassName(className))
      }
      else if (!inlinableRules.has(className)) {
        residualClassMap.set(className, className)
      }
    }

    const headClasses = new Set([...nonInlinableRules.keys(), ...animationReferences.keys()])

    return {
      inlinable,
      residualClassMap,
      headClasses,
      stylesheetOrder,
      headRules: splitHeadRules(
        orderedNonInlinable,
        nonInlinableRules,
        keyframesDefinitions.filter(definition => referencedKeyframeNames.has(definition.name)),
        animationReferences,
      ),
    }
  }

  return { computeStyles }
}
