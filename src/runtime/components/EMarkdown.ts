import type { DefineComponent, PropType, VNodeChild } from 'vue'
import { Comment, defineComponent, Fragment, h, isVNode, Text } from 'vue'
import { assertSafeEmailAttributes } from './attributes'
import type { EmailStyle } from './style'
import type { StylesType } from './markdown/styles'
import { renderMarkdown } from './markdown/render-markdown'

export type EMarkdownProps = {
  source?: string
  markdownCustomStyles?: StylesType
  markdownContainerStyles?: EmailStyle
}

// react-dom's `unitlessNumbers` set (react-dom 19). react-dom serializes a numeric
// style value as `${value}px` unless the property is unitless, the value is 0, or the
// property is a custom property. React renders the Markdown container as
// `<div style={markdownContainerStyles}>`, so its numeric values follow this rule; Vue
// never appends px, so numbers would otherwise emit invalid CSS (e.g. `padding:8`).
const UNITLESS_STYLE_PROPERTIES = new Set([
  'animationIterationCount', 'aspectRatio', 'borderImageOutset', 'borderImageSlice',
  'borderImageWidth', 'boxFlex', 'boxFlexGroup', 'boxOrdinalGroup', 'columnCount',
  'columns', 'flex', 'flexGrow', 'flexPositive', 'flexShrink', 'flexNegative',
  'flexOrder', 'gridArea', 'gridRow', 'gridRowEnd', 'gridRowSpan', 'gridRowStart',
  'gridColumn', 'gridColumnEnd', 'gridColumnSpan', 'gridColumnStart', 'fontWeight',
  'lineClamp', 'lineHeight', 'opacity', 'order', 'orphans', 'scale', 'tabSize',
  'widows', 'zIndex', 'zoom', 'fillOpacity', 'floodOpacity', 'stopOpacity',
  'strokeDasharray', 'strokeDashoffset', 'strokeMiterlimit', 'strokeOpacity',
  'strokeWidth', 'MozAnimationIterationCount', 'MozBoxFlex', 'MozBoxFlexGroup',
  'MozLineClamp', 'msAnimationIterationCount', 'msFlex', 'msZoom', 'msFlexGrow',
  'msFlexNegative', 'msFlexOrder', 'msFlexPositive', 'msFlexShrink', 'msGridColumn',
  'msGridColumnSpan', 'msGridRow', 'msGridRowSpan', 'WebkitAnimationIterationCount',
  'WebkitBoxFlex', 'WebKitBoxFlexGroup', 'WebkitBoxOrdinalGroup', 'WebkitColumnCount',
  'WebkitColumns', 'WebkitFlex', 'WebkitFlexGrow', 'WebkitFlexPositive',
  'WebkitFlexShrink', 'WebkitLineClamp',
])

function withReactPxUnits(style: EmailStyle): EmailStyle {
  const result: EmailStyle = {}
  for (const [property, value] of Object.entries(style)) {
    result[property] = typeof value === 'number'
      && value !== 0
      && !property.startsWith('--')
      && !UNITLESS_STYLE_PROPERTIES.has(property)
      ? `${value}px`
      : value
  }
  return result
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
  setup(props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EMarkdown', attrs)
      const source = typeof props.source === 'string'
        ? props.source
        : slotSource(slots.default?.() ?? [])

      // React renders `<div {...props} style={markdownContainerStyles}>`: fall-through
      // attributes are forwarded, but the explicit style prop always overrides any
      // fall-through `style` (dropping it when markdownContainerStyles is undefined).
      const attributes: Record<string, unknown> = { ...attrs }
      delete attributes.style

      return h('div', {
        ...attributes,
        innerHTML: renderMarkdown(source, props.markdownCustomStyles),
        ...(props.markdownContainerStyles === undefined
          ? {}
          : { style: withReactPxUnits(props.markdownContainerStyles) }),
      })
    }
  },
}) as DefineComponent<EMarkdownProps>
