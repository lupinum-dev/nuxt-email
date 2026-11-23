import type { DefineComponent, HTMLAttributes, SlotsType, VNodeArrayChildren, VNodeChild } from 'vue'
import { createCommentVNode, defineComponent, h, inject } from 'vue'
import { EMAIL_RENDER_STATE, HEAD_PLACEHOLDER } from '../tw'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { takeCellClasses, useCellClasses } from './layout-table'
import { normalizeEmailStyle } from './style'

export type EEmailProps = Omit<SafeEmailAttributes<HTMLAttributes>, 'lang' | 'dir'> & {
  subject: string
  lang: string
  preview?: string
  dir?: 'ltr' | 'rtl' | 'auto'
  /** Plain-text version; replaces the text derived from the HTML. */
  text?: string
}

const PREVIEW_MAX_LENGTH = 200
// Invisible characters after the preview text keep clients from showing body text next to it.
const PREVIEW_WHITESPACE = ' ‌​‍‎‏﻿'
const PREVIEW_STYLE = {
  display: 'none',
  overflow: 'hidden',
  lineHeight: '1px',
  opacity: 0,
  maxHeight: 0,
  maxWidth: 0,
}

// A body style sets these to 0 on <body>; the inner cell keeps the author's values.
const BODY_RESET_PROPERTIES = [
  'margin',
  'marginTop',
  'marginBottom',
  'marginRight',
  'marginLeft',
  'marginInline',
  'marginBlock',
  'marginBlockStart',
  'marginBlockEnd',
  'marginInlineStart',
  'marginInlineEnd',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingRight',
  'paddingLeft',
  'paddingInline',
  'paddingBlock',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInlineStart',
  'paddingInlineEnd',
] as const

/** At most 200 UTF-16 code units, never ending in half of a surrogate pair. */
function previewText(preview: string): string {
  const truncated = preview.substring(0, PREVIEW_MAX_LENGTH)
  const finalCodeUnit = truncated.charCodeAt(truncated.length - 1)
  return finalCodeUnit >= 0xD800 && finalCodeUnit <= 0xDBFF ? truncated.slice(0, -1) : truncated
}

function preview(text: string) {
  const filler = text.length >= PREVIEW_MAX_LENGTH ? undefined : PREVIEW_WHITESPACE.repeat(PREVIEW_MAX_LENGTH - text.length)
  return h('div', { 'style': PREVIEW_STYLE, 'data-skip-in-text': 'true' }, [
    text,
    ...(filler === undefined ? [] : [h('div', filler)]),
  ])
}

function body(attrs: Record<string, unknown>, cellClasses: ReadonlySet<string>, dir: string | undefined, lang: string, children: VNodeArrayChildren) {
  const { style, ...attributes } = attrs
  // Every class goes on the cell, beside the author style; padding-only classes leave <body>.
  const cellClass = attributes.class
  takeCellClasses(attributes, cellClasses)
  const normalizedStyle = normalizeEmailStyle(style)
  const hasStyle = normalizedStyle !== undefined && Object.keys(normalizedStyle).length > 0
  const bodyStyle: Record<string, string | number | undefined> = {}
  if (hasStyle) {
    bodyStyle.background = normalizedStyle.background
    bodyStyle.backgroundColor = normalizedStyle.backgroundColor
    for (const property of BODY_RESET_PROPERTIES) {
      if (normalizedStyle[property] !== undefined) bodyStyle[property] = 0
    }
  }
  // The cell keeps the author style and classes as written.
  const cell: Record<string, unknown> = { dir, lang }
  if (cellClass !== undefined) cell.class = cellClass
  if (hasStyle) cell.style = style
  return h('body', {
    ...attributes,
    dir,
    lang,
    ...(Object.values(bodyStyle).some(value => value !== undefined) ? { style: bodyStyle } : {}),
  }, [
    h('table', { border: 0, width: '100%', cellpadding: '0', cellspacing: '0', role: 'presentation', align: 'center' }, [
      h('tbody', [h('tr', [h('td', cell, children)])]),
    ]),
  ])
}

/**
 * The root of every email: `<html>`, `<head>` with the two standard meta tags,
 * the `#head` slot with the Tailwind head rules, the hidden preview text and
 * `<body>` with its presentation table. `class` and `style` apply to the inner
 * cell. Other attributes apply to `<body>`, which also repeats the background
 * and every class except padding-only ones such as `sm:p-8`.
 */
export const EEmail = defineComponent({
  name: 'EEmail',
  inheritAttrs: false,
  props: {
    subject: { type: String, required: true },
    lang: { type: String, required: true },
    preview: { type: String, default: undefined },
    dir: { type: String, default: 'ltr' },
    text: { type: String, default: undefined },
  },
  slots: Object as SlotsType<{ default?: () => VNodeChild, head?: () => VNodeChild }>,
  setup(props, { attrs, slots }) {
    const state = inject(EMAIL_RENDER_STATE, null)
    if (state === null) throw new TypeError('EEmail must be rendered by renderEmail().')
    state.emailCount++
    const cellClasses = useCellClasses()
    return () => {
      if (typeof props.subject !== 'string') throw new TypeError('EEmail subject must be a string.')
      const { lang, dir } = props
      if (typeof lang !== 'string' || lang.trim().length === 0) throw new TypeError('EEmail lang must be a non-empty string')
      assertSafeEmailAttributes('EEmail', attrs)
      state.subject = props.subject
      state.text = props.text
      return h('html', { dir, lang }, [
        h('head', [
          h('meta', { 'content': 'text/html; charset=UTF-8', 'http-equiv': 'Content-Type' }),
          h('meta', { name: 'x-apple-disable-message-reformatting' }),
          slots.head?.(),
          createCommentVNode(HEAD_PLACEHOLDER),
        ]),
        body(attrs, cellClasses, dir, lang, [
          props.preview === undefined ? null : preview(previewText(props.preview)),
          slots.default?.(),
        ]),
      ])
    }
  },
}) as DefineComponent<EEmailProps>
