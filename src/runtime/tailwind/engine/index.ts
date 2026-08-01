import { type CssNode, generate, List, type StyleSheet } from 'css-tree'
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
   * Original (unsanitized) names of every class that produced a non-inlinable
   * rule, in stylesheet-emission order — the exact list React Email interpolates
   * into its no-`<head>` error (`Array.from(nonInlinableRules.keys())`,
   * tailwind.tsx). This order (breakpoint/variant emission order) differs from the
   * authored class order, so it cannot be reconstructed from {@link residualClassMap}
   * and must be carried canonically.
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

    const { inlinable: inlinableRules, nonInlinable: nonInlinableRules }
      = extractRulesPerClass(styleSheet, classNames)

    const customProperties = getCustomProperties(styleSheet)

    // Build, sanitize, and downlevel the injectable (media / pseudo) rules.
    const nonInlineStyles: StyleSheet = {
      type: 'StyleSheet',
      children: new List<CssNode>().fromArray(
        Array.from(nonInlinableRules.values()).flat(),
      ),
    }
    sanitizeNonInlinableRules(nonInlineStyles)
    downlevelForEmailClients(nonInlineStyles)
    const nonInlinableCss
      = nonInlinableRules.size > 0 ? generate(nonInlineStyles) : ''

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

    return {
      inlinable,
      nonInlinableCss,
      residualClassMap,
      nonInlinableClassNames: Array.from(nonInlinableRules.keys()),
    }
  }

  return { computeStyles }
}

export { pixelBasedPreset } from './pixel-based-preset'
export type { TailwindConfig, TailwindEngineOptions } from './types'
