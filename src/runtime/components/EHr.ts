import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { mergeEmailStyles } from './style'

export type EHrProps = SafeEmailAttributes<HTMLAttributes>

const DEFAULT_HR_STYLE = {
  width: '100%',
  border: 'none',
  borderColor: 'transparent',
  borderTop: '1px solid #eaeaea',
}

export const EHr = defineComponent({
  name: 'EHr',
  inheritAttrs: false,
  setup(_props, { attrs }) {
    return () => {
      assertSafeEmailAttributes('EHr', attrs)
      const { style, ...attributes } = attrs
      return h('hr', {
        ...attributes,
        style: mergeEmailStyles(DEFAULT_HR_STYLE, style),
      })
    }
  },
}) as DefineComponent<EHrProps>
