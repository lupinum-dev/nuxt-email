import { type CssNode, type Declaration, generate, parse, type Rule, type StyleSheet, type Value, walk } from '../../css-tree'

/**
 * Replace each `var()` in a declaration with a value, because email clients do
 * not read custom properties. Tailwind's own theme is imported inline, so what is
 * left are the `--tw-*` properties of composed utilities (shadow, ring, border
 * style, ...) and theme values from `@theme` in `app/emails/tailwind.css`.
 *
 * A name takes the first value found: a custom property in the same rule, one in a
 * `:root` rule, the `@property` initial value, then the `var()` fallback. An empty
 * fallback (Tailwind's `var(--tw-ordinal,)` stacking idiom) leaves nothing, as in
 * a browser. A name with no value at all stays as written.
 */
export function resolveVariables(styleSheet: StyleSheet): void {
  const global = new Map<string, string>()
  const rules: Rule[] = []
  walk(styleSheet, {
    enter(node: CssNode) {
      if (node.type === 'Atrule' && node.name === 'property' && node.prelude && node.block) {
        const initial = node.block.children.toArray().find(child => child.type === 'Declaration' && child.property === 'initial-value') as Declaration | undefined
        if (initial) global.set(generate(node.prelude), generate(initial.value).trim())
      }
      if (node.type === 'Rule') rules.push(node)
    },
  })
  // `:root` values win over `@property` initial values.
  for (const rule of rules) {
    if (!generate(rule.prelude).includes(':root')) continue
    for (const declaration of ownDeclarations(rule)) {
      if (declaration.property.startsWith('--')) global.set(declaration.property, generate(declaration.value).trim())
    }
  }

  for (const rule of rules) {
    const local = new Map(global)
    const declarations = ownDeclarations(rule)
    for (const declaration of declarations) {
      if (declaration.property.startsWith('--')) local.set(declaration.property, generate(declaration.value).trim())
    }
    for (const declaration of declarations) {
      if (declaration.property.startsWith('--')) continue
      const value = generate(declaration.value)
      if (!value.includes('var(')) continue
      declaration.value = parse(substitute(value, local, new Set()), { context: 'value' }) as Value
    }
  }
}

function ownDeclarations(rule: Rule): Declaration[] {
  return rule.block.children.toArray().filter(child => child.type === 'Declaration')
}

/** Replace every `var(name, fallback)` in `text`; `seen` stops a cycle. */
function substitute(text: string, values: Map<string, string>, seen: Set<string>): string {
  let output = ''
  let index = 0
  for (let start = text.indexOf('var(', index); start !== -1; start = text.indexOf('var(', index)) {
    let depth = 1
    let comma = -1
    let end = start + 4
    for (; end < text.length && depth > 0; end++) {
      if (text[end] === '(') depth++
      else if (text[end] === ')') depth--
      else if (text[end] === ',' && depth === 1 && comma === -1) comma = end
    }
    const inner = text.slice(start + 4, end - 1)
    const name = (comma === -1 ? inner : text.slice(start + 4, comma)).trim()
    const fallback = comma === -1 ? undefined : text.slice(comma + 1, end - 1)
    const value = seen.has(name) ? undefined : values.get(name)
    const replacement = value !== undefined
      ? substitute(value, values, new Set([...seen, name]))
      : fallback !== undefined ? substitute(fallback, values, seen).trim() : text.slice(start, end)
    output += text.slice(index, start) + replacement
    index = end
  }
  return (output + text.slice(index)).trim()
}
