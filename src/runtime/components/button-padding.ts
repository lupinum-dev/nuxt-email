import { normalizeEmailStyle } from './style'

type PaddingValue = unknown

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
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new TypeError(`EButton padding must be a finite non-negative value; received ${String(value)}`)
    }
    return value
  }

  if (typeof value !== 'string') {
    throw new TypeError(`EButton padding must be a number or CSS length string; received ${String(value)}`)
  }

  const normalizedValue = value.trim()
  if (normalizedValue === '0') {
    return 0
  }

  const matches = /^(\d+(?:\.\d+)?|\.\d+)(px|em|rem|%)$/.exec(normalizedValue)
  if (!matches) {
    throw new TypeError(
      `EButton padding supports only non-negative px, em, rem, and % values; received ${value}`,
    )
  }

  const amount = Number.parseFloat(matches[1]!)
  if (!Number.isFinite(amount)) {
    throw new TypeError(`EButton padding must resolve to finite pixels; received ${value}`)
  }
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

  throw new TypeError(`EButton padding shorthand must contain one to four values; received ${String(value)}`)
}

function convertOptionalPadding(value: PaddingValue): number | undefined {
  return value === undefined ? undefined : convertToPixels(value)
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
    paddingTop: convertOptionalPadding(paddingTop),
    paddingRight: convertOptionalPadding(paddingRight),
    paddingBottom: convertOptionalPadding(paddingBottom),
    paddingLeft: convertOptionalPadding(paddingLeft),
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
