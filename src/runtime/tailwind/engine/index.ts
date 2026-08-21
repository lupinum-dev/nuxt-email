import {
  type Atrule,
  clone,
  type CssNode,
  generate,
  List,
  type Rule,
  type StyleSheet,
  walk,
} from 'css-tree'
import { downlevelForEmailClients } from './css/downlevel-for-email-clients'
import { extractRulesPerClass } from './css/extract-rules-per-class'
import { getCustomProperties } from './css/get-custom-properties'
import { makeInlineStylesFor } from './css/make-inline-styles-for'
import { sanitizeClassName } from './compatibility/sanitize-class-name'
import { sanitizeNonInlinableRules } from './css/sanitize-non-inlinable-rules'
import { sanitizeStyleSheet } from './sanitize-stylesheet'
import { setupTailwind } from './setup-tailwind'
import type { TailwindEngineOptions } from './types'

/**
 * A single element's inline styles as ordered kebab-case CSS declarations
 * (`cssProperty -> value`). Insertion order matches React Email's object-spread
 * serialization order; `Map.set` semantics (keep first position, overwrite
 * value) mirror plain-object key assignment, so a consumer can replicate
 * `{ ...twStyle, ...authorStyle }` author-wins merging exactly.
 */
export type InlineStyleMap = Map<string, string>

export interface ComputedStyles {
  /**
   * Per-class inline styles. Only classes that produced at least one inlinable
   * declaration appear here. Keyed by the ORIGINAL (unsanitized) class name.
   */
  inlinable: Map<string, InlineStyleMap>
  /**
   * The `<style>` body to inject into the first `<head>`: media-query and
   * pseudo-class rules, unnested and downleveled for email clients, with class
   * selectors sanitized. Empty string when there are no such rules.
   */
  nonInlinableCss: string
  /**
   * Classes that must REMAIN on the element, mapped ORIGINAL -> OUTPUT:
   *   - a non-inlinable class maps to its sanitized selector name
   *     (matching the selectors emitted in {@link nonInlinableCss});
   *   - an unknown class (no Tailwind rule at all) maps to itself.
   * A class that only produced inlinable styles is absent — the consumer drops
   * it from the `class` attribute. Mirrors React Email's residual-class logic in
   * `clone-element-with-inlined-styles.ts`.
   */
  residualClassMap: Map<string, string>
  /**
   * Original (unsanitized) names of classes that need the generated `<head>`
   * CSS: non-inlinable rules and animation declarations with referenced
   * keyframes. Non-inlinable rules keep stylesheet-emission order; animation-only
   * classes follow in authored order. This list drives the missing-`<head>` error
   * and cannot be reconstructed from {@link residualClassMap}, because an
   * animation declaration itself can still be inlined.
   */
  nonInlinableClassNames: string[]
}

export interface TailwindEngine {
  /**
   * Compute inline styles, injectable CSS, and residual classes for the given
   * set of class names (collected across the whole `<Tailwind>` subtree).
   *
   * Should be called once per engine with the full class list, matching React
   * Email's one-setup-per-`<Tailwind>` model. The underlying compiler only
   * accumulates candidates, and each call re-parses a fresh stylesheet AST, so
   * repeated calls never cross-contaminate — but a call only "sees" classes in
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
  rulesByClass: Map<string, Rule[]>,
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

/**
 * Framework-neutral Tailwind engine. Mirrors the CSS pipeline of React Email's
 * `<Tailwind>` component (`tailwind.tsx`) without any view-layer coupling: a
 * consumer collects the class names used in a rendered email, calls
 * {@link TailwindEngine.computeStyles}, then applies the result to the HTML.
 */
export async function createTailwindEngine(
  options: TailwindEngineOptions = {},
): Promise<TailwindEngine> {
  const { config, theme, utility } = options

  const tailwindSetup = await setupTailwind({
    config,
    cssConfigs: { theme, utility },
  })

  const computeStyles = (classNames: string[]): ComputedStyles => {
    tailwindSetup.addUtilities(classNames)

    const styleSheet = tailwindSetup.getStyleSheet()
    sanitizeStyleSheet(styleSheet)

    const {
      inlinable: inlinableRules,
      nonInlinable: nonInlinableRules,
      orderedNonInlinable,
    }
      = extractRulesPerClass(styleSheet, classNames)

    const customProperties = getCustomProperties(styleSheet)
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

    // Build, sanitize, and downlevel the injectable (media / pseudo) rules.
    const nonInlineStyles: StyleSheet = {
      type: 'StyleSheet',
      children: new List<CssNode>().fromArray(orderedNonInlinable),
    }
    sanitizeNonInlinableRules(nonInlineStyles)
    for (const definition of keyframesDefinitions) {
      if (referencedKeyframeNames.has(definition.name)) {
        nonInlineStyles.children.appendData(clone(definition.node))
      }
    }
    downlevelForEmailClients(nonInlineStyles)
    const nonInlinableCss = nonInlineStyles.children.isEmpty
      ? ''
      : generate(nonInlineStyles)

    // Per-class inline declarations.
    const inlinable = new Map<string, InlineStyleMap>()
    for (const [className, rules] of inlinableRules) {
      inlinable.set(className, makeInlineStylesFor(rules, customProperties))
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

    const nonInlinableClassNames = new Set(nonInlinableRules.keys())
    for (const className of classNames) {
      if (
        animationReferences.has(className)
        && !nonInlinableRules.has(className)
      ) nonInlinableClassNames.add(className)
    }

    return {
      inlinable,
      nonInlinableCss,
      residualClassMap,
      nonInlinableClassNames: [...nonInlinableClassNames],
    }
  }

  return { computeStyles }
}

export { pixelBasedPreset } from './pixel-based-preset'
export type { TailwindConfig, TailwindEngineOptions } from './types'
