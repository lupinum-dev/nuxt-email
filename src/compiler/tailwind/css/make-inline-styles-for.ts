import { type CssNode, generate, walk } from '../../css-tree'

/**
 * Adapted from React Email's `make-inline-styles-for.ts`.
 *
 * Variables are already resolved for the whole stylesheet (`resolveVariables`), so
 * this only collects the declarations of a class's rules, as lowercase kebab-case
 * properties in stylesheet order. Custom properties are left out.
 */
export function makeInlineStylesFor(inlinableRules: CssNode[]): Map<string, string> {
  const styles = new Map<string, string>()
  for (const rule of inlinableRules) {
    walk(rule, {
      visit: 'Declaration',
      enter(declaration) {
        if (declaration.property.startsWith('--')) return
        styles.set(
          declaration.property.toLowerCase(),
          generate(declaration.value).trim() + (declaration.important ? '!important' : ''),
        )
      },
    })
  }
  return styles
}
