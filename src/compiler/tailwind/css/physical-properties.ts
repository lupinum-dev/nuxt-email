import { type CssNode, type Declaration, generate, List, parse, type Value } from '../../css-tree'

// Email clients read logical properties poorly, so generated CSS uses the physical
// properties of a left-to-right email. A right-to-left email uses physical utilities.
const SIDE: Record<string, string> = {
  'inline-start': 'left',
  'inline-end': 'right',
  'block-start': 'top',
  'block-end': 'bottom',
}
const AXIS: Record<string, [string, string]> = {
  inline: ['left', 'right'],
  block: ['top', 'bottom'],
}
const CORNER: Record<string, string> = {
  'start-start': 'top-left',
  'start-end': 'top-right',
  'end-start': 'bottom-left',
  'end-end': 'bottom-right',
}
const KEYWORD: Record<string, Record<string, string>> = {
  'text-align': { start: 'left', end: 'right' },
  'float': { 'inline-start': 'left', 'inline-end': 'right' },
  'clear': { 'inline-start': 'left', 'inline-end': 'right' },
}

// `inset-inline-start` is `left`; `padding-inline-start` is `padding-left`.
const SIDE_PROPERTY = /^(inset|padding|margin|scroll-margin|scroll-padding|border)-(inline|block)-(start|end)(-(?:width|style|color))?$/
const AXIS_PROPERTY = /^(inset|padding|margin|scroll-margin|scroll-padding|border)-(inline|block)(-(?:width|style|color))?$/
const CORNER_PROPERTY = /^border-(start|end)-(start|end)-radius$/

function declaration(template: Declaration, property: string, value: Value | Declaration['value']): Declaration {
  return { type: 'Declaration', property, value, important: template.important }
}

function physicalName(prefix: string, side: string, suffix = ''): string {
  return prefix === 'inset' ? side : `${prefix}-${side}${suffix}`
}

/** Value components of a two-value logical shorthand such as `margin-inline: 0 16px`. */
function sides(value: Declaration['value'], splits: boolean): [Declaration['value'], Declaration['value']] {
  if (!splits || value.type !== 'Value') return [value, value]
  const parts = value.children.toArray().filter(child => child.type !== 'WhiteSpace')
  if (parts.length !== 2) return [value, value]
  const single = (node: CssNode): Value => ({ type: 'Value', children: new List<CssNode>().fromArray([node]) })
  return [single(parts[0]!), single(parts[1]!)]
}

/** The physical declarations for a logical one, or `undefined` when it is physical already. */
export function physicalDeclarations(node: Declaration): Declaration[] | undefined {
  const property = node.property.toLowerCase()
  const keywords = KEYWORD[property]
  if (keywords !== undefined) {
    const physical = keywords[generate(node.value).trim().toLowerCase()]
    return physical === undefined ? undefined : [declaration(node, property, parse(physical, { context: 'value' }) as Value)]
  }
  const corner = CORNER_PROPERTY.exec(property)
  if (corner) return [declaration(node, `border-${CORNER[`${corner[1]}-${corner[2]}`]}-radius`, node.value)]
  const side = SIDE_PROPERTY.exec(property)
  if (side) return [declaration(node, physicalName(side[1]!, SIDE[`${side[2]}-${side[3]}`]!, side[4]), node.value)]
  const axis = AXIS_PROPERTY.exec(property)
  if (axis) {
    const [first, second] = AXIS[axis[2]!]!
    // `border-inline: 1px solid red` names one border for both sides; the other shorthands take start and end.
    const [start, end] = sides(node.value, !(axis[1] === 'border' && axis[3] === undefined))
    return [
      declaration(node, physicalName(axis[1]!, first, axis[3]), start),
      declaration(node, physicalName(axis[1]!, second, axis[3]), end),
    ]
  }
  return undefined
}
