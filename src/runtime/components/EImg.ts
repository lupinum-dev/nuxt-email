import type { DefineComponent, ImgHTMLAttributes } from 'vue'
import { defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { mergeEmailStyles } from './style'

export type EImgProps = Omit<SafeEmailAttributes<ImgHTMLAttributes>, 'alt' | 'src'> & {
  alt: string
  src: string
}

const DEFAULT_IMAGE_STYLE = {
  display: 'block',
  outline: 'none',
  border: 'none',
  textDecoration: 'none',
}

export const EImg = defineComponent({
  name: 'EImg',
  inheritAttrs: false,
  props: {
    alt: {
      type: String,
      required: true,
    },
    src: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs }) {
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('EImg', attrs)
      if (typeof props.alt !== 'string') {
        throw new TypeError('EImg alt must be a string; use an empty string for decorative images')
      }
      if (typeof props.src !== 'string' || props.src.length === 0) {
        throw new TypeError('EImg src must be a non-empty string')
      }
      const { style, ...attributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, attributes, style).style
      return h('img', {
        ...attributes,
        alt: props.alt,
        src: props.src,
        style: mergeEmailStyles(DEFAULT_IMAGE_STYLE, effectiveStyle),
      })
    }
  },
}) as DefineComponent<EImgProps>
