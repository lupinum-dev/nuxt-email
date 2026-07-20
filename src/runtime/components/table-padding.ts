import type { EmailStyle } from './style'
import { normalizeEmailStyle } from './style'

const CELL_PADDING_PROPERTIES = new Set([
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
])

export interface SplitTableStyle {
  tableStyle: EmailStyle
  cellStyle: EmailStyle
}

export function splitTablePadding(style: unknown): SplitTableStyle {
  const tableStyle: EmailStyle = {}
  const cellStyle: EmailStyle = {}

  for (const [property, value] of Object.entries(normalizeEmailStyle(style) ?? {})) {
    if (CELL_PADDING_PROPERTIES.has(property)) {
      cellStyle[property] = value
    }
    else {
      tableStyle[property] = value
    }
  }

  return { tableStyle, cellStyle }
}
