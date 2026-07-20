import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { textStyle } from './text-margins'

export type ETextProps = SafeEmailAttributes<HTMLAttributes>

export const EText = defineComponent({
  name: 'EText',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('EText', attrs)
      const { style, ...attributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, attributes, style).style

      return h('p', {
        ...attributes,
        style: textStyle(effectiveStyle),
      }, slots.default?.())
    }
  },
}) as DefineComponent<ETextProps>
