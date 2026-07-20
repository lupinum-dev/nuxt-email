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

export interface EFontProps {
  /** The font you want to use. Do not insert multiple fonts here, use fallbackFontFamily for that. */
  fontFamily: string
  /** An array is possible; the order of the array is the priority order. */
  fallbackFontFamily: FontFallback | FontFallback[]
  /** Web font source; not all clients support web fonts. */
  webFont?: FontWebFont
  /** Default: 'normal' */
  fontStyle?: string
  /** Default: 400 */
  fontWeight?: string | number
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
      type: [String, Array] as PropType<FontFallback | FontFallback[]>,
      required: true,
    },
    webFont: {
      type: Object as PropType<FontWebFont>,
      default: undefined,
    },
    fontStyle: {
      type: String,
      default: 'normal',
    },
    fontWeight: {
      type: [String, Number] as PropType<string | number>,
      default: 400,
    },
  },
  setup(props) {
    return () => {
      const src = props.webFont
        ? `src: url(${props.webFont.url}) format('${props.webFont.format}');`
        : ''

      const style = `
    @font-face {
      font-family: '${props.fontFamily}';
      font-style: ${props.fontStyle};
      font-weight: ${props.fontWeight};
      mso-font-alt: '${
        Array.isArray(props.fallbackFontFamily)
          ? props.fallbackFontFamily[0]
          : props.fallbackFontFamily
      }';
      ${src}
    }

    * {
      font-family: '${props.fontFamily}', ${
        Array.isArray(props.fallbackFontFamily)
          ? props.fallbackFontFamily.join(', ')
          : props.fallbackFontFamily
      };
    }
  `

      return h('style', { innerHTML: style })
    }
  },
}) as DefineComponent<EFontProps>
