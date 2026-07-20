import type { EmailStyle } from './style'

export interface HeadingSpacing {
  m?: string | number
  mx?: string | number
  my?: string | number
  mt?: string | number
  mr?: string | number
  mb?: string | number
  ml?: string | number
}

function applySpacing(style: EmailStyle, value: string | number | undefined, properties: string[]): void {
  if (value === undefined || Number.isNaN(Number.parseFloat(String(value)))) {
    return
  }

  for (const property of properties) {
    style[property] = `${value}px`
  }
}

export function headingSpacing(spacing: HeadingSpacing): EmailStyle {
  const style: EmailStyle = {}

  applySpacing(style, spacing.m, ['margin'])
  applySpacing(style, spacing.mx, ['marginLeft', 'marginRight'])
  applySpacing(style, spacing.my, ['marginTop', 'marginBottom'])
  applySpacing(style, spacing.mt, ['marginTop'])
  applySpacing(style, spacing.mr, ['marginRight'])
  applySpacing(style, spacing.mb, ['marginBottom'])
  applySpacing(style, spacing.ml, ['marginLeft'])

  return style
}
