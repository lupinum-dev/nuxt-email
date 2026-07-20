import type { AnchorHTMLAttributes, DefineComponent } from 'vue'
import { defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { mergeEmailStyles } from './style'

export type ELinkProps = Omit<SafeEmailAttributes<AnchorHTMLAttributes>, 'href'> & {
  href: string
}

const DEFAULT_LINK_STYLE = {
  color: '#067df7',
  textDecorationLine: 'none',
}

export const ELink = defineComponent({
  name: 'ELink',
  inheritAttrs: false,
  props: {
    href: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs, slots }) {
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('ELink', attrs)
      if (typeof props.href !== 'string' || props.href.length === 0) {
        throw new TypeError('ELink href must be a non-empty string')
      }
      const { style, ...attributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, attributes, style).style
      return h('a', {
        ...attributes,
        href: props.href,
        style: mergeEmailStyles(DEFAULT_LINK_STYLE, effectiveStyle),
        target: attrs.target ?? '_blank',
      }, slots.default?.())
    }
  },
}) as DefineComponent<ELinkProps>
