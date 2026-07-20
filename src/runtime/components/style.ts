import type { StyleValue } from 'vue'
import { camelize, normalizeStyle } from 'vue'

export type EmailStyle = Record<string, string | number | undefined>

export function isEmailStyle(style: unknown): style is EmailStyle {
  return typeof style === 'object' && style !== null && !Array.isArray(style)
}

export function normalizeEmailStyle(style: unknown): EmailStyle | undefined {
  if (style === undefined || style === null) {
    return undefined
  }

  const normalized = normalizeStyle([style])
  if (!isEmailStyle(normalized)) {
    return undefined
  }

  const emailStyle: EmailStyle = {}
  for (const [property, value] of Object.entries(normalized)) {
    emailStyle[property.startsWith('--') ? property : camelize(property)] = value
  }

  return emailStyle
}

export function mergeEmailStyles(defaults: EmailStyle, style: unknown): StyleValue {
  if (isEmailStyle(style)) {
    return { ...defaults, ...style }
  }

  if (Array.isArray(style)) {
    return [defaults, ...style] as StyleValue
  }

  if (typeof style === 'string') {
    return [defaults, style]
  }

  return defaults
}
