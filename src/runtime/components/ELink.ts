import type { AnchorHTMLAttributes, DefineComponent } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { trimSlotEdges } from './slot-text'
import { assertSafeUrl } from './url'

export type ELinkProps = Omit<SafeEmailAttributes<AnchorHTMLAttributes>, 'href'> & {
  href: string
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
    return () => {
      assertSafeEmailAttributes('ELink', attrs)
      if (typeof props.href !== 'string' || props.href.length === 0) {
        throw new TypeError('ELink href must be a non-empty string')
      }
      assertSafeUrl('ELink', 'href', props.href)
      const { style, ...attributes } = attrs
      return h('a', {
        ...attributes,
        href: props.href,
        ...(style === undefined || style === null
          ? {}
          : { style: style }),
        target: attrs.target ?? '_blank',
      }, trimSlotEdges(slots.default?.()))
    }
  },
}) as DefineComponent<ELinkProps>
