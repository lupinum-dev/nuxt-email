import type { DefineComponent, HTMLAttributes, PropType } from 'vue'
import { defineComponent, h } from 'vue'
import { assertSafeEmailAttributes } from './attributes'
import type { SafeEmailAttributes } from './attributes'
import type { StylesType } from './markdown/styles'
import { renderMarkdown } from './markdown/render-markdown'

export type EMarkdownProps = SafeEmailAttributes<HTMLAttributes> & {
  source: string
  markdownCustomStyles?: StylesType
}

export const EMarkdown = defineComponent({
  name: 'EMarkdown',
  inheritAttrs: false,
  props: {
    source: {
      type: String as PropType<string>,
      required: true,
    },
    markdownCustomStyles: {
      type: Object as PropType<StylesType>,
      required: false,
      default: undefined,
    },
  },
  setup(props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EMarkdown', attrs)
      // Vue only warns about a missing required prop, and would drop slot content silently.
      if (typeof props.source !== 'string' || slots.default !== undefined) {
        throw new TypeError('EMarkdown takes its Markdown from the source prop, for example <EMarkdown :source="body" />')
      }
      return h('div', {
        ...attrs,
        innerHTML: renderMarkdown(props.source, props.markdownCustomStyles),
      })
    }
  },
}) as DefineComponent<EMarkdownProps>
