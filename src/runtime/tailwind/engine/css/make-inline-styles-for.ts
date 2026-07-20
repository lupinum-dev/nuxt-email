import { type CssNode, type Declaration, generate, walk } from 'css-tree'
import { getCssProperty } from './get-css-property'
import type { CustomProperties } from './get-custom-properties'
import { stripEmptyTailwindVars } from './strip-empty-tailwind-vars'
import { unwrapValue } from './unwrap-value'

/**
 * Adapted from React Email's `make-inline-styles-for.ts`.
 *
 * The algorithm (local-variable resolution, custom-property fallbacks,
 * empty-`--tw-*`-var stripping) is a faithful port. The only difference is the
 * return shape: React Email produces `Record<reactStyleKey, value>` to spread
 * onto a React element's `style` prop; this engine produces an ordered
 * `Map<cssProperty, value>` of real kebab-case CSS declarations for a
 * post-render HTML transform.
 *
 * A `Map` (rather than a joined string) is used because it preserves both:
 *   - insertion order — matching React's object-spread serialization order, and
 *   - per-property granularity — so the consumer can replicate React's
 *     `{ ...twStyle, ...authorStyle }` author-wins merge exactly (author overrides
 *     a tw property in place, appends new ones), which a flat string cannot
 *     express without re-parsing. Its `set` semantics (keep first position,
 *     overwrite value) match plain-object key assignment 1:1.
 */
export function makeInlineStylesFor(
  inlinableRules: CssNode[],
  customProperties: CustomProperties,
): Map<string, string> {
  const styles = new Map<string, string>()

  const localVariableDeclarations = new Map<string, Declaration>()
  for (const rule of inlinableRules) {
    walk(rule, {
      visit: 'Declaration',
      enter(declaration) {
        if (declaration.property.startsWith('--')) {
          localVariableDeclarations.set(declaration.property, declaration)
        }
      },
    })
  }

  for (const rule of inlinableRules) {
    walk(rule, {
      visit: 'Function',
      enter(func, funcParentListItem) {
        if (func.name === 'var') {
          let variableName: string | undefined
          walk(func, {
            visit: 'Identifier',
            enter(identifier) {
              variableName = identifier.name
              return this.break
            },
          })
          if (variableName) {
            const definition = localVariableDeclarations.get(variableName)
            if (definition) {
              funcParentListItem.data = unwrapValue(definition.value)
            }
            else {
              // For most variables tailwindcss defines, they also define a custom
              // property for them with an initial value that we can inline here
              const customProperty = customProperties.get(variableName)
              if (customProperty?.initialValue) {
                funcParentListItem.data = unwrapValue(
                  customProperty.initialValue.value,
                )
              }
            }
          }
        }
      },
    })

    walk(rule, {
      visit: 'Declaration',
      enter(declaration) {
        if (declaration.property.startsWith('--')) {
          return
        }
        stripEmptyTailwindVars(declaration.value)

        styles.set(
          getCssProperty(declaration.property),
          generate(declaration.value).trim()
          + (declaration.important ? '!important' : ''),
        )
      },
    })
  }

  return styles
}
