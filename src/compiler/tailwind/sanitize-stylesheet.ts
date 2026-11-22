import { Features, transform } from 'lightningcss'
import { type CssNode, generate, type List, type ListItem, parse, type StyleSheet, type Value, walk, type WalkContext } from '../css-tree'
import { physicalDeclarations } from './css/physical-properties'
import { resolveCalcExpressions } from './css/resolve-calc-expressions'
import { resolveVariables } from './css/resolve-variables'
import { sanitizeDeclarations } from './css/sanitize-declarations'

/** Colour syntax that the legacy declaration before it already covers. */
const MODERN_COLOR = /\b(?:lab|lch|oklab|oklch|color)\(/
const EXCLUSIVE = '-exclusive'
const COLOR_FUNCTION = /^(?:color-mix|rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)$/i

/**
 * Turn compiled Tailwind CSS into email-safe CSS without nesting.
 *
 * Owned steps: media range syntax becomes `min-`/`max-` features, `var()` gets its
 * value, `calc()` is evaluated in double precision, `oklch()` becomes `rgb()` and `rem`
 * becomes `px` at 16px per rem (media conditions too).
 * Lightning CSS then removes nesting and writes colors in legacy syntax
 * (`color-mix()`, space-separated `rgb()`, hex with alpha). It stores numbers as
 * 32-bit floats, so number nodes with more than six significant digits outside color
 * functions pass it as placeholders: `line-height: 1.33333` would change the line box
 * in Chrome. Fully transparent
 * black goes back to the keyword `transparent`, and logical properties, which Lightning CSS
 * also writes, become physical ones for a left-to-right email.
 */
export function sanitizeStyleSheet(css: string): StyleSheet {
  // `width < X` excludes X, so it ends just below it: `sm:hidden` and `max-sm:hidden` never both match.
  const styleSheet = parse(css.replace(
    /\((width|height)\s*([<>])(=?)\s*([^\s)][^)]*)\)/g,
    (_match, feature: string, comparison: string, inclusive: string, value: string) =>
      `(${comparison === '>' ? 'min' : 'max'}-${feature}${comparison === '<' && !inclusive ? EXCLUSIVE : ''}:${value.trim()})`,
  )) as StyleSheet
  resolveVariables(styleSheet)
  resolveCalcExpressions(styleSheet)
  sanitizeDeclarations(styleSheet)
  // Outlook on Windows does not read `rem`; 1rem is 16px in every email client.
  walk(styleSheet, {
    visit: 'Dimension',
    enter(node) {
      if (node.unit.toLowerCase() !== 'rem') return
      node.value = String(Math.round(Number(node.value) * 16 * 1e4) / 1e4)
      node.unit = 'px'
    },
  })
  walk(styleSheet, (node: CssNode) => {
    // css-tree 3 parses a media feature as `Feature`; @types/css-tree still names the older `MediaFeature`.
    if ((node.type as string) !== 'Feature') return
    const feature = node as unknown as { name: string, value: CssNode | null }
    if (!feature.name.endsWith(EXCLUSIVE)) return
    feature.name = feature.name.slice(0, -EXCLUSIVE.length)
    if (feature.value?.type === 'Dimension' && feature.value.unit === 'px') {
      feature.value.value = String(Math.round((Number(feature.value.value) - 0.02) * 100) / 100)
    }
  })

  const numbers: string[] = []
  walk(styleSheet, {
    enter(this: WalkContext, node: CssNode) {
      if (node.type !== 'Number' && node.type !== 'Dimension' && node.type !== 'Percentage') return
      // Colors end as 8-bit channels, so rounding cannot change them; Lightning CSS must see the number to convert them.
      if (this.function !== null && COLOR_FUNCTION.test(this.function.name)) return
      if (!node.value.includes('.') || node.value.replace(/^[-+]?[0.]+/, '').replace('.', '').length <= 6) return
      numbers.push(node.value)
      node.value = `__number${numbers.length - 1}__`
    },
  })
  const { code } = transform({
    filename: 'tailwind.css',
    code: Buffer.from(generate(styleSheet)),
    include: Features.Nesting | Features.Colors | Features.MediaRangeSyntax,
  })
  const output = parse(code.toString().replace(/__number(\d+)__/g, (_match, index: string) => numbers[Number(index)]!)) as StyleSheet

  walk(output, {
    enter(node: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
      if (node.type === 'Declaration') {
        const physical = physicalDeclarations(node)
        if (physical !== undefined) {
          for (const declaration of physical) list.insertData(declaration, item)
          list.remove(item)
          return
        }
      }
      if (node.type === 'Atrule' && node.name === 'supports' && node.prelude && MODERN_COLOR.test(generate(node.prelude))) list.remove(item)
      if (node.type === 'Declaration' && MODERN_COLOR.test(generate(node.value)) && item.prev?.data.type === 'Declaration' && item.prev.data.property === node.property) list.remove(item)
      // Lightning CSS writes `transparent` as `rgba(0,0,0,0)`; Outlook on Windows reads only the keyword.
      if (node.type === 'Function' && node.name === 'rgba' && generate(node) === 'rgba(0,0,0,0)') item.data = { type: 'Identifier', name: 'transparent' }
    },
    leave(node: CssNode) {
      // Tailwind stacks shadow and ring layers whose unused ones are `0 0 #0000`; they draw nothing.
      if (node.type !== 'Declaration' || node.property !== 'box-shadow') return
      const layers = generate(node.value).split(/,(?![^(]*\))/)
      const drawn = layers.filter(layer => layer !== '0 0 transparent')
      if (drawn.length < layers.length) node.value = parse(drawn.join(',') || 'none', { context: 'value' }) as Value
    },
  })
  return output
}
