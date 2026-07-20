import type { DefineComponent, PropType, VNodeChild } from 'vue'
import { Comment, defineComponent, Fragment, h, isVNode, Text } from 'vue'
import type { EmailStyle } from './style'
import type { StylesType } from './markdown/styles'
import { renderMarkdown } from './markdown/render-markdown'

export type EMarkdownProps = {
  source?: string
  markdownCustomStyles?: StylesType
  markdownContainerStyles?: EmailStyle
}

// Deterministically extract markdown source from the default slot. Only text and numeric
// vnodes (optionally wrapped in Text/Fragment nodes) are accepted; any element vnode throws.
// This mirrors EPreview's text-only extraction so a single interpolated string expression is
// captured verbatim while structural markup is rejected rather than silently stringified.
function appendSlotText(child: VNodeChild, text: { value: string }): void {
  if (child === null || child === undefined || typeof child === 'boolean') {
    return
  }
  if (typeof child === 'string' || typeof child === 'number') {
    text.value += String(child)
    return
  }
  if (Array.isArray(child)) {
    for (const nestedChild of child) {
      appendSlotText(nestedChild, text)
    }
    return
  }
  if (!isVNode(child)) {
    throw new TypeError('EMarkdown default slot must contain text only')
  }
  if (child.type === Comment) {
    return
  }
  if (child.type === Text) {
    appendSlotText(child.children as VNodeChild, text)
    return
  }
  if (child.type === Fragment && Array.isArray(child.children)) {
    appendSlotText(child.children, text)
    return
  }
  throw new TypeError('EMarkdown default slot must contain text only')
}

function slotSource(children: VNodeChild): string {
  const text = { value: '' }
  appendSlotText(children, text)
  return text.value
}

export const EMarkdown = defineComponent({
  name: 'EMarkdown',
  inheritAttrs: false,
  props: {
    source: {
      type: String as PropType<string>,
      required: false,
      default: undefined,
    },
    markdownCustomStyles: {
      type: Object as PropType<StylesType>,
      required: false,
      default: undefined,
    },
    markdownContainerStyles: {
      type: Object as PropType<EmailStyle>,
      required: false,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    return () => {
      const source = typeof props.source === 'string'
        ? props.source
        : slotSource(slots.default?.() ?? [])

      return h('div', {
        innerHTML: renderMarkdown(source, props.markdownCustomStyles),
        ...(props.markdownContainerStyles === undefined
          ? {}
          : { style: props.markdownContainerStyles }),
      })
    }
  },
}) as DefineComponent<EMarkdownProps>
