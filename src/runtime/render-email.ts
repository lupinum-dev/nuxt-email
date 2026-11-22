import type { Component } from 'vue'
import type { StyleLookup, StyleTable } from './tw'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { emailComponents } from './components/email-components'
import { EMAIL_DOCTYPE } from './render/doctype'
import { EmailRenderError } from './render/errors'
import { renderPlainText } from './render/plain-text'
import { assertKnownProps } from './render/props'
import { UnknownEmailTemplateError } from './template-registry/errors'
import { createCellClasses, createEmailRenderState, createStyleLookup, createTw, EMAIL_RENDER_STATE, fillHead } from './tw'

export interface RenderedEmail {
  html: string
  text: string
  subject: string
}

export type { EmailComponentProps, EmailRenderArgs } from './render/types'

/** A rendered email plus the diagnostics of the same render, for the dev preview and the test renderer. */
export interface InspectedEmail extends RenderedEmail {
  /** Classes kept as written because the style table has no entry for them, sorted. */
  unknownClasses: string[]
}

interface EmailTemplateEntry {
  component: () => Promise<{ default: Component }>
}

interface EmailRendererOptions {
  /** Lazy template loaders by registry name, as `#nuxt-email/registry` exports them. */
  templates: Readonly<Record<string, EmailTemplateEntry>>
  styleTable: StyleTable
  /** Components registered in addition to the built-in set, such as a configured `ECodeBlock`. */
  components?: Readonly<Record<string, Component>>
}

const WHITESPACE = /\s/

/**
 * Remove whitespace and complete `<!--…-->` comments (Vue fragment markers) at each end of
 * the rendered document. It runs in linear time, because the string can hold author HTML.
 */
export function trimOuterComments(html: string): string {
  let start = 0
  for (;;) {
    while (start < html.length && WHITESPACE.test(html[start]!)) start++
    if (!html.startsWith('<!--', start)) break
    const close = html.indexOf('-->', start + 4)
    if (close === -1) break
    start = close + 3
  }
  // A trailing comment whose text contains `<!--` is removed only in part; the rest then fails the EEmail root check.
  let end = html.length
  for (;;) {
    while (end > start && WHITESPACE.test(html[end - 1]!)) end--
    if (end - 7 < start || !html.endsWith('-->', end)) break
    const open = html.lastIndexOf('<!--', end - 7)
    if (open < start) break
    end = open
  }
  return html.slice(start, end)
}

async function render(
  template: Component,
  props: Record<string, unknown>,
  components: Readonly<Record<string, Component>>,
  table: StyleTable,
  lookup: StyleLookup,
  cellClasses: ReadonlySet<string>,
): Promise<InspectedEmail> {
  assertKnownProps(template, props)
  const state = createEmailRenderState(cellClasses)
  const app = createSSRApp(template, props)
  for (const [name, component] of Object.entries(components)) app.component(name, component)
  app.provide(EMAIL_RENDER_STATE, state)
  app.config.globalProperties._tw = createTw(lookup, state)
  // Vue SSR resolves to `<!---->` when setup throws after an await; keep the real cause.
  let failure: { cause: unknown } | undefined
  app.config.errorHandler = (error) => {
    failure ??= { cause: error }
  }
  const rendered = await renderToString(app)
  if (failure !== undefined) throw failure.cause

  if (state.emailCount === 0) throw new TypeError('An email template must use EEmail as its root.')
  if (state.emailCount > 1) throw new TypeError('An email template must render exactly one EEmail.')
  const document = trimOuterComments(rendered)
  if (!document.startsWith('<html') || !document.endsWith('</html>')) {
    throw new TypeError('EEmail must be the root of the email template, with nothing around it.')
  }

  const body = document
    .replaceAll('<!--[-->', '')
    .replaceAll('<!--]-->', '')
    .replaceAll('<!---->', '')
  const { subject, text } = state
  if (subject === undefined) throw new TypeError('EEmail did not render a subject.')
  const html = EMAIL_DOCTYPE + fillHead(body, table, state.usedHeadClasses)
  return { html, text: text ?? renderPlainText(html), subject, unknownClasses: [...state.unknownClasses].sort() }
}

function createTemplateRenderer(options: EmailRendererOptions) {
  const { templates, styleTable } = options
  const lookup = createStyleLookup(styleTable)
  const cellClasses = createCellClasses(styleTable)
  const components = { ...emailComponents, ...options.components }

  return async (name: string, props: Record<string, unknown>): Promise<InspectedEmail> => {
    const entry = typeof name === 'string' && Object.hasOwn(templates, name) ? templates[name] : undefined
    if (entry === undefined) throw new UnknownEmailTemplateError(String(name), Object.keys(templates))
    try {
      const template = (await entry.component()).default
      return await render(template, props, components, styleTable, lookup, cellClasses)
    }
    catch (error) {
      throw error instanceof EmailRenderError ? error : new EmailRenderError(name, error)
    }
  }
}

export function createEmailRenderer(options: EmailRendererOptions) {
  const renderTemplate = createTemplateRenderer(options)
  return async function renderEmail(name: string, props: Record<string, unknown> = {}): Promise<RenderedEmail> {
    const { html, text, subject } = await renderTemplate(name, props)
    return { html, text, subject }
  }
}

/** Development and tests only: the same render as `renderEmail`, plus the classes kept as written. */
export function createEmailInspector(options: EmailRendererOptions) {
  const renderTemplate = createTemplateRenderer(options)
  return async function inspectEmail(name: string, props: Record<string, unknown> = {}): Promise<InspectedEmail> {
    return await renderTemplate(name, props)
  }
}
