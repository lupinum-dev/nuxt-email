import type { DefineComponent, TdHTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'

export type EColumnProps = SafeEmailAttributes<TdHTMLAttributes>

export const EColumn = defineComponent({
  name: 'EColumn',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EColumn', attrs)
      return h('td', attrs, slots.default?.())
    }
  },
}) as DefineComponent<EColumnProps>
