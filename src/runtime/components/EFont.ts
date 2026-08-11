import type { DefineComponent, PropType } from 'vue'
import { defineComponent, h } from 'vue'

export type FontFallback
  = | 'Arial'
    | 'Helvetica'
    | 'Verdana'
    | 'Georgia'
    | 'Times New Roman'
    | 'serif'
    | 'sans-serif'
    | 'monospace'
    | 'cursive'
    | 'fantasy'

export type FontFormat
  = | 'woff'
    | 'woff2'
    | 'truetype'
    | 'opentype'
    | 'embedded-opentype'
    | 'svg'

export interface FontWebFont {
  url: string
  format: FontFormat
}

export type FontStyle = 'normal' | 'italic' | 'oblique'
export type FontWeight = number | 'normal' | 'bold' | 'bolder' | 'lighter'
export type FontFallbackList = readonly [FontFallback, ...FontFallback[]]

export interface EFontProps {
  /** The font you want to use. Do not insert multiple fonts here, use fallbackFontFamily for that. */
  fontFamily: string
  /** A non-empty array is possible; the order of the array is the priority order. */
  fallbackFontFamily: FontFallback | FontFallbackList
  /** Web font source; not all clients support web fonts. */
  webFont?: FontWebFont
  /** Default: 'normal' */
  fontStyle?: FontStyle
  /** Default: 400 */
  fontWeight?: FontWeight
}

const FONT_FALLBACKS = new Set<FontFallback>([
  'Arial',
  'Helvetica',
  'Verdana',
  'Georgia',
  'Times New Roman',
  'serif',
  'sans-serif',
  'monospace',
  'cursive',
  'fantasy',
])
const FONT_FORMATS = new Set<FontFormat>([
  'woff',
  'woff2',
  'truetype',
  'opentype',
  'embedded-opentype',
  'svg',
])
const FONT_STYLES = new Set<FontStyle>(['normal', 'italic', 'oblique'])
const FONT_WEIGHTS = new Set<Exclude<FontWeight, number>>(['normal', 'bold', 'bolder', 'lighter'])
const SAFE_UNQUOTED_URL = /^[\w\-.~:/?#[\]@!$&*+,;=%]+$/

function cssString(value: string): string {
  return value.replace(/[\\'\n\r\f\0<>]/g, (character) => {
    switch (character) {
      case '\\': return '\\\\'
      case '\'': return '\\\''
      case '\n':
      case '\r':
      case '\f': return '\\A '
      case '\0': return '\\FFFD '
      case '<': return '\\3C '
      case '>': return '\\3E '
      default: return character
    }
  })
}

function cssUrl(value: string): string {
  return SAFE_UNQUOTED_URL.test(value) ? value : `'${cssString(value)}'`
}

function assertValidFontProps(props: EFontProps): void {
  if (props.fontFamily.trim().length === 0) {
    throw new TypeError('EFont fontFamily must be a non-empty string')
  }

  const fallbacks = Array.isArray(props.fallbackFontFamily)
    ? props.fallbackFontFamily
    : [props.fallbackFontFamily]
  if (fallbacks.length === 0) {
    throw new TypeError('EFont fallbackFontFamily must contain at least one fallback')
  }
  const invalidFallback = fallbacks.find(fallback => !FONT_FALLBACKS.has(fallback))
  if (invalidFallback !== undefined) {
    throw new TypeError(`EFont fallbackFontFamily contains unsupported fallback ${JSON.stringify(invalidFallback)}`)
  }

  if (!FONT_STYLES.has(props.fontStyle ?? 'normal')) {
    throw new TypeError(`EFont fontStyle must be normal, italic, or oblique; received ${JSON.stringify(props.fontStyle)}`)
  }
  const weight = props.fontWeight ?? 400
  if (
    typeof weight === 'number'
      ? !Number.isFinite(weight) || weight < 1 || weight > 1000
      : !FONT_WEIGHTS.has(weight)
  ) {
    throw new TypeError(`EFont fontWeight must be between 1 and 1000 or a supported keyword; received ${JSON.stringify(weight)}`)
  }

  if (props.webFont !== undefined) {
    if (props.webFont.url.trim().length === 0) {
      throw new TypeError('EFont webFont.url must be a non-empty string')
    }
    if (!FONT_FORMATS.has(props.webFont.format)) {
      throw new TypeError(`EFont webFont.format is unsupported: ${JSON.stringify(props.webFont.format)}`)
    }
  }
}

/** The component MUST be placed inside the <head> tag. */
export const EFont = defineComponent({
  name: 'EFont',
  inheritAttrs: false,
  props: {
    fontFamily: {
      type: String,
      required: true,
    },
    fallbackFontFamily: {
      type: [String, Array] as PropType<FontFallback | FontFallbackList>,
      required: true,
    },
    webFont: {
      type: Object as PropType<FontWebFont>,
      default: undefined,
    },
    fontStyle: {
      type: String as PropType<FontStyle>,
      default: 'normal',
    },
    fontWeight: {
      type: [String, Number] as PropType<FontWeight>,
      default: 400,
    },
  },
  setup(props) {
    return () => {
      assertValidFontProps(props)
      const fallbacks = Array.isArray(props.fallbackFontFamily)
        ? props.fallbackFontFamily
        : [props.fallbackFontFamily]
      const src = props.webFont
        ? `src: url(${cssUrl(props.webFont.url)}) format('${props.webFont.format}');`
        : ''

      const style = `
    @font-face {
      font-family: '${cssString(props.fontFamily)}';
      font-style: ${props.fontStyle};
      font-weight: ${props.fontWeight};
      mso-font-alt: '${fallbacks[0]}';
      ${src}
    }

    * {
      font-family: '${cssString(props.fontFamily)}', ${fallbacks.join(', ')};
    }
  `

      return h('style', { innerHTML: style })
    }
  },
}) as DefineComponent<EFontProps>
