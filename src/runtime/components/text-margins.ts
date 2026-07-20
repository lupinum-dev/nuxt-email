import type { EmailStyle } from './style'
import { normalizeEmailStyle } from './style'

type MarginValue = string | number | undefined

export interface MarginProperties {
  margin?: MarginValue
  marginTop?: MarginValue
  marginRight?: MarginValue
  marginBottom?: MarginValue
  marginLeft?: MarginValue
}

export interface ComputedMargins {
  marginTop: MarginValue
  marginRight: MarginValue
  marginBottom: MarginValue
  marginLeft: MarginValue
}

function parseMargin(value: MarginValue): ComputedMargins {
  const empty = {
    marginTop: undefined,
    marginRight: undefined,
    marginBottom: undefined,
    marginLeft: undefined,
  }

  if (typeof value === 'number') {
    return {
      marginTop: value,
      marginBottom: value,
      marginLeft: value,
      marginRight: value,
    }
  }

  if (typeof value !== 'string') {
    return empty
  }

  const values = value.trim().split(/\s+/)
  if (values.length === 1) {
    return {
      marginTop: values[0],
      marginBottom: values[0],
      marginLeft: values[0],
      marginRight: values[0],
    }
  }
  if (values.length === 2) {
    return {
      marginTop: values[0],
      marginBottom: values[0],
      marginLeft: values[1],
      marginRight: values[1],
    }
  }
  if (values.length === 3) {
    return {
      marginTop: values[0],
      marginBottom: values[2],
      marginLeft: values[1],
      marginRight: values[1],
    }
  }
  if (values.length === 4) {
    return {
      marginTop: values[0],
      marginBottom: values[2],
      marginLeft: values[3],
      marginRight: values[1],
    }
  }

  return empty
}

export function computeTextMargins(properties: MarginProperties): ComputedMargins {
  let result = parseMargin(undefined)

  for (const [property, value] of Object.entries(properties)) {
    if (property === 'margin') {
      result = parseMargin(value)
    }
    else if (property === 'marginTop' || property === 'marginRight' || property === 'marginBottom' || property === 'marginLeft') {
      result[property] = value
    }
  }

  return result
}

export function textStyle(style: unknown): EmailStyle {
  const emailStyle = normalizeEmailStyle(style) ?? {}
  const defaults: MarginProperties = {}
  if (emailStyle.marginTop === undefined) {
    defaults.marginTop = '16px'
  }
  if (emailStyle.marginBottom === undefined) {
    defaults.marginBottom = '16px'
  }

  return {
    fontSize: '14px',
    lineHeight: '24px',
    ...emailStyle,
    ...computeTextMargins({ ...defaults, ...emailStyle }),
  }
}
