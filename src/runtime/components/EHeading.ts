import type { DefineComponent, HTMLAttributes, PropType } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const HEADING_TAGS = new Set<HeadingTag>(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export type EHeadingProps = SafeEmailAttributes<HTMLAttributes> & {
  as?: HeadingTag
}

export const EHeading = defineComponent({
  name: 'EHeading',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<HeadingTag>,
      default: 'h1',
    },
  },
  setup(props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EHeading', attrs)
      const tag = props.as ?? 'h1'
      if (!HEADING_TAGS.has(tag)) {
        throw new TypeError(`EHeading as must be one of ${[...HEADING_TAGS].join(', ')}; received ${String(tag)}`)
      }

      return h(tag, attrs, slots.default?.())
    }
  },
}) as DefineComponent<EHeadingProps>
