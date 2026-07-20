import { normalizeEmailStyle } from './style'

type PaddingValue = string | number | undefined

export interface ParsedPadding {
  paddingTop: number | undefined
  paddingRight: number | undefined
  paddingBottom: number | undefined
  paddingLeft: number | undefined
}

interface ExpandedPadding {
  paddingTop: PaddingValue
  paddingRight: PaddingValue
  paddingBottom: PaddingValue
  paddingLeft: PaddingValue
}

export function convertToPixels(value: PaddingValue): number {
  if (!value) {
    return 0
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`EButton padding must resolve to finite pixels; received ${String(value)}`)
    }
    return value
  }

  const matches = /^([\d.]+)(px|em|rem|%)$/.exec(value)
  if (!matches) {
    return 0
  }

  const amount = Number.parseFloat(matches[1]!)
  switch (matches[2]) {
    case 'em':
    case 'rem':
      return amount * 16
    case '%':
      return (amount / 100) * 600
    default:
      return amount
  }
}

function expandPadding(value: PaddingValue): ExpandedPadding {
  if (typeof value === 'number') {
    return {
      paddingTop: value,
      paddingBottom: value,
      paddingLeft: value,
      paddingRight: value,
    }
  }
  if (typeof value === 'string') {
    const values = value.trim().split(/\s+/)
    if (values.length === 1) {
      return {
        paddingTop: values[0],
        paddingBottom: values[0],
        paddingLeft: values[0],
        paddingRight: values[0],
      }
    }
    if (values.length === 2) {
      return {
        paddingTop: values[0],
        paddingRight: values[1],
        paddingBottom: values[0],
        paddingLeft: values[1],
      }
    }
    if (values.length === 3) {
      return {
        paddingTop: values[0],
        paddingRight: values[1],
        paddingBottom: values[2],
        paddingLeft: values[1],
      }
    }
    if (values.length === 4) {
      return {
        paddingTop: values[0],
        paddingRight: values[1],
        paddingBottom: values[2],
        paddingLeft: values[3],
      }
    }
  }

  return {
    paddingTop: undefined,
    paddingRight: undefined,
    paddingBottom: undefined,
    paddingLeft: undefined,
  }
}

export function parseButtonPadding(style: unknown): ParsedPadding {
  let paddingTop: PaddingValue
  let paddingRight: PaddingValue
  let paddingBottom: PaddingValue
  let paddingLeft: PaddingValue

  for (const [property, value] of Object.entries(normalizeEmailStyle(style) ?? {})) {
    if (property === 'padding') {
      ({ paddingTop, paddingRight, paddingBottom, paddingLeft } = expandPadding(value))
    }
    else if (property === 'paddingTop') {
      paddingTop = value
    }
    else if (property === 'paddingRight') {
      paddingRight = value
    }
    else if (property === 'paddingBottom') {
      paddingBottom = value
    }
    else if (property === 'paddingLeft') {
      paddingLeft = value
    }
  }

  return {
    paddingTop: paddingTop ? convertToPixels(paddingTop) : undefined,
    paddingRight: paddingRight ? convertToPixels(paddingRight) : undefined,
    paddingBottom: paddingBottom ? convertToPixels(paddingBottom) : undefined,
    paddingLeft: paddingLeft ? convertToPixels(paddingLeft) : undefined,
  }
}

export function pixelsToPoints(pixels: number | undefined): number | undefined {
  return typeof pixels === 'number' && !Number.isNaN(Number(pixels))
    ? (pixels * 3) / 4
    : undefined
}

export function pixelStyle(value: number | undefined): string | number | undefined {
  if (value === undefined || value === 0) {
    return value
  }

  return `${value}px`
}
