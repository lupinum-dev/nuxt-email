import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'

export type EHeadProps = SafeEmailAttributes<HTMLAttributes>

export const EHead = defineComponent({
  name: 'EHead',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EHead', attrs)
      const children = slots.default?.() ?? []

      return h('head', attrs, [
        h('meta', { 'content': 'text/html; charset=UTF-8', 'http-equiv': 'Content-Type' }),
        h('meta', { name: 'x-apple-disable-message-reformatting' }),
        ...children,
      ])
    }
  },
}) as DefineComponent<EHeadProps>
