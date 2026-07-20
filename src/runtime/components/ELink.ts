import type { AnchorHTMLAttributes, DefineComponent } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { mergeEmailStyles } from './style'

export type ELinkProps = SafeEmailAttributes<AnchorHTMLAttributes>

const DEFAULT_LINK_STYLE = {
  color: '#067df7',
  textDecorationLine: 'none',
}

export const ELink = defineComponent({
  name: 'ELink',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('ELink', attrs)
      const { style, ...attributes } = attrs
      return h('a', {
        ...attributes,
        style: mergeEmailStyles(DEFAULT_LINK_STYLE, style),
        target: attrs.target ?? '_blank',
      }, slots.default?.())
    }
  },
}) as DefineComponent<ELinkProps>
