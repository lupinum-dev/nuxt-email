import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'

export type EHtmlProps = SafeEmailAttributes<HTMLAttributes>

export const EHtml = defineComponent({
  name: 'EHtml',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EHtml', attrs)
      const { dir = 'ltr', lang = 'en', ...attributes } = attrs

      return h('html', {
        ...attributes,
        dir,
        lang,
      }, slots.default?.())
    }
  },
}) as DefineComponent<EHtmlProps>
