import type { DefineComponent, ImgHTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { mergeEmailStyles } from './style'

export type EImgProps = SafeEmailAttributes<ImgHTMLAttributes>

const DEFAULT_IMAGE_STYLE = {
  display: 'block',
  outline: 'none',
  border: 'none',
  textDecoration: 'none',
}

export const EImg = defineComponent({
  name: 'EImg',
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      assertSafeEmailAttributes('EImg', attrs)
      const { style, ...attributes } = attrs
      return h('img', {
        ...attributes,
        alt: attrs.alt ?? '',
        style: mergeEmailStyles(DEFAULT_IMAGE_STYLE, style),
      })
    }
  },
}) as DefineComponent<EImgProps>
