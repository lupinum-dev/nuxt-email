import type { DefineComponent, HTMLAttributes, PropType } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { headingSpacing } from './heading-spacing'
import { mergeEmailStyles } from './style'

export type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

const HEADING_TAGS = new Set<HeadingTag>(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])

export type EHeadingProps = SafeEmailAttributes<HTMLAttributes> & {
  as?: HeadingTag
  m?: string | number
  mx?: string | number
  my?: string | number
  mt?: string | number
  mr?: string | number
  mb?: string | number
  ml?: string | number
}

const spacingProp = [String, Number] as PropType<string | number>

export const EHeading = defineComponent({
  name: 'EHeading',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<HeadingTag>,
      default: 'h1',
    },
    m: spacingProp,
    mx: spacingProp,
    my: spacingProp,
    mt: spacingProp,
    mr: spacingProp,
    mb: spacingProp,
    ml: spacingProp,
  },
  setup(props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EHeading', attrs)
      const { style, ...attributes } = attrs
      const tag = props.as ?? 'h1'
      if (!HEADING_TAGS.has(tag)) {
        throw new TypeError(`EHeading as must be one of ${[...HEADING_TAGS].join(', ')}; received ${String(tag)}`)
      }

      const spacingStyle = headingSpacing(props)
      return h(tag, {
        ...attributes,
        ...(Object.keys(spacingStyle).length === 0 && style === undefined
          ? {}
          : { style: mergeEmailStyles(spacingStyle, style) }),
      }, slots.default?.())
    }
  },
}) as DefineComponent<EHeadingProps>
