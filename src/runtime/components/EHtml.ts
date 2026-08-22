import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'

export type EHtmlProps = Omit<SafeEmailAttributes<HTMLAttributes>, 'lang'> & {
  lang: string
}

export const EHtml = defineComponent({
  name: 'EHtml',
  inheritAttrs: false,
  props: {
    lang: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EHtml', attrs)
      const { dir = 'ltr', ...attributes } = attrs
      const { lang } = props
      if (typeof lang !== 'string' || lang.trim().length === 0) {
        throw new TypeError('EHtml lang must be a non-empty string')
      }

      return h('html', {
        ...attributes,
        dir,
        lang,
      }, slots.default?.())
    }
  },
}) as DefineComponent<EHtmlProps>
