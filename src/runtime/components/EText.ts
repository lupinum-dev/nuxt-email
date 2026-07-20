import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { textStyle } from './text-margins'

export type ETextProps = SafeEmailAttributes<HTMLAttributes>

export const EText = defineComponent({
  name: 'EText',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EText', attrs)
      const { style, ...attributes } = attrs

      return h('p', {
        ...attributes,
        style: textStyle(style),
      }, slots.default?.())
    }
  },
}) as DefineComponent<ETextProps>
