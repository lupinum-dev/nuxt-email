import type { DefineComponent, HTMLAttributes, VNodeChild } from 'vue'
import { Comment, defineComponent, Fragment, h, isVNode, Text } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { normalizeEmailStyle } from './style'

export const PREVIEW_MAX_LENGTH = 200
export const PREVIEW_WHITESPACE = '\u00A0\u200C\u200B\u200D\u200E\u200F\uFEFF'

export type EPreviewProps = SafeEmailAttributes<HTMLAttributes>

const DEFAULT_PREVIEW_STYLE = {
  display: 'none',
  overflow: 'hidden',
  lineHeight: '1px',
  opacity: 0,
  maxHeight: 0,
  maxWidth: 0,
}

const PREVIEW_READ_LIMIT = PREVIEW_MAX_LENGTH + 1

function appendPreviewText(child: VNodeChild, text: { value: string }): void {
  if (text.value.length >= PREVIEW_READ_LIMIT) {
    return
  }
  if (child === null || child === undefined || typeof child === 'boolean') {
    return
  }
  if (typeof child === 'string' || typeof child === 'number') {
    const remainingLength = PREVIEW_READ_LIMIT - text.value.length
    text.value += String(child).substring(0, remainingLength)
    return
  }
  if (Array.isArray(child)) {
    for (const nestedChild of child) {
      appendPreviewText(nestedChild, text)
      if (text.value.length >= PREVIEW_READ_LIMIT) {
        break
      }
    }
    return
  }
  if (!isVNode(child)) {
    throw new TypeError('EPreview default slot must contain text only')
  }
  if (child.type === Comment) {
    return
  }
  if (child.type === Text) {
    appendPreviewText(child.children as VNodeChild, text)
    return
  }
  if (child.type === Fragment && Array.isArray(child.children)) {
    appendPreviewText(child.children, text)
    return
  }
  throw new TypeError('EPreview default slot must contain text only')
}

export function previewText(children: VNodeChild): string {
  const text = { value: '' }
  appendPreviewText(children, text)
  const truncated = text.value.substring(0, PREVIEW_MAX_LENGTH)
  const finalCodeUnit = truncated.charCodeAt(truncated.length - 1)

  return finalCodeUnit >= 0xD800 && finalCodeUnit <= 0xDBFF
    ? truncated.slice(0, -1)
    : truncated
}

export function previewWhitespace(text: string): string | undefined {
  if (text.length >= PREVIEW_MAX_LENGTH) {
    return undefined
  }

  return PREVIEW_WHITESPACE.repeat(PREVIEW_MAX_LENGTH - text.length)
}

export const EPreview = defineComponent({
  name: 'EPreview',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EPreview', attrs)
      const text = previewText(slots.default?.() ?? [])
      const filler = previewWhitespace(text)
      const { style, ...attributes } = attrs
      delete attributes['data-skip-in-text']

      return h('div', {
        'style': { ...normalizeEmailStyle(style), ...DEFAULT_PREVIEW_STYLE },
        'data-skip-in-text': 'true',
        ...attributes,
      }, [
        text,
        ...(filler === undefined ? [] : [h('div', filler)]),
      ])
    }
  },
}) as DefineComponent<EPreviewProps>
