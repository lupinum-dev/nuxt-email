import { inject } from 'vue'
import { EMAIL_RENDER_STATE } from '../tw'
import { assertSafeEmailAttributes } from './attributes'
import type { EmailStyle } from './style'
import { normalizeEmailStyle } from './style'

const FIXED_PRESENTATION_TABLE_ATTRIBUTES = new Set(['border', 'cellpadding', 'cellspacing', 'role'])

const CELL_PADDING_PROPERTIES = new Set([
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
])

/**
 * The presentation-table primitives (ERow, ESection, EContainer) hard-code
 * border, cellpadding, cellspacing, and role to keep the email-client-safe
 * layout invariant. React Email lets callers override them (props spread after
 * the defaults); nuxt-email throws instead of silently discarding the override.
 */
function assertFixedPresentationTable(
  componentName: string,
  attributes: Readonly<Record<string, unknown>>,
): void {
  const overrides = Object.keys(attributes).filter(
    name => FIXED_PRESENTATION_TABLE_ATTRIBUTES.has(name.toLowerCase()),
  )

  if (overrides.length > 0) {
    throw new TypeError(
      `${componentName} does not allow overriding fixed presentation-table attribute${overrides.length === 1 ? '' : 's'}: ${overrides.join(', ')}; border, cellpadding, cellspacing, and role are fixed to preserve the email-client-safe table layout`,
    )
  }
}

/** Residual names of classes whose head rules set only padding (`sm_p-8`); call in `setup`. */
export function useCellClasses(): ReadonlySet<string> {
  return inject(EMAIL_RENDER_STATE, undefined)?.cellClasses ?? new Set<string>()
}

/**
 * Take the cell classes out of `attributes.class` and return them. The class stays in
 * place, so the attribute order and output without cell classes stay the same. The
 * transform passes residual classes as one string; anything else stays where it is.
 */
export function takeCellClasses(attributes: Record<string, unknown>, cellClasses: ReadonlySet<string>): string | undefined {
  const classes = attributes.class
  if (cellClasses.size === 0 || typeof classes !== 'string') return undefined
  const names = classes.split(' ')
  const cell = names.filter(name => cellClasses.has(name))
  if (cell.length === 0) return undefined
  const rest = names.filter(name => !cellClasses.has(name)).join(' ')
  if (rest === '') delete attributes.class
  else attributes.class = rest
  return cell.join(' ')
}

/** Physical padding belongs on the inner cell; every other declaration stays on the table. */
export function splitPadding(style: unknown): { tableStyle: EmailStyle, cellStyle: EmailStyle } {
  const tableStyle: EmailStyle = {}
  const cellStyle: EmailStyle = {}
  for (const [property, value] of Object.entries(normalizeEmailStyle(style) ?? {})) {
    if (CELL_PADDING_PROPERTIES.has(property)) cellStyle[property] = value
    else tableStyle[property] = value
  }
  return { tableStyle, cellStyle }
}

/**
 * Check the attributes of `ESection`, `ERow` or `EContainer` and split them between the
 * table and its inner cell: padding and cell classes go to the cell.
 */
export function layoutTable(componentName: string, attrs: Readonly<Record<string, unknown>>, cellClasses: ReadonlySet<string>) {
  assertSafeEmailAttributes(componentName, attrs)
  assertFixedPresentationTable(componentName, attrs)
  const { style, ...attributes } = attrs
  const cellClass = takeCellClasses(attributes, cellClasses)
  const { tableStyle, cellStyle } = splitPadding(style)
  const cell: Record<string, unknown> = {
    ...(cellClass === undefined ? {} : { class: cellClass }),
    ...(Object.keys(cellStyle).length > 0 ? { style: cellStyle } : {}),
  }
  return { attributes, tableStyle, cell }
}
