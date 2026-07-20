import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
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
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('EHr', attrs)
      const { style, ...attributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, attributes, style).style
      return h('hr', {
        ...attributes,
        style: mergeEmailStyles(DEFAULT_HR_STYLE, effectiveStyle),
      })
    }
  },
}) as DefineComponent<EHrProps>
