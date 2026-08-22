import type { TailwindRegion } from '../tailwind/nested'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Options declared by an email template via {@link defineEmail}.
 *
 * String values are constant metadata. Functions are zero-argument closures
 * over the template's real `defineProps()` value and run synchronously after
 * the HTML render completes.
 */
export type EmailMetadataValue = string | (() => string)

export type DefineEmailOptions
  = | { subject: EmailMetadataValue, text?: EmailMetadataValue }
    | { subject?: EmailMetadataValue, text: EmailMetadataValue }

const EMAIL_RENDER_BRAND = Symbol('nuxt-email:render-context')

/**
 * Per-render context propagated independently of a Vue component instance.
 * `useSSRContext()` is an injected app context and does not directly cover the
 * standalone renderer's arbitrary async setup, nested renders, or public testing
 * helper. `AsyncLocalStorage` follows the complete async execution instead, so
 * `defineEmail()` reaches the right render before or after an await and concurrent
 * renders each see their own store.
 */
const renderContextStorage = new AsyncLocalStorage<EmailRenderContext>()

/**
 * Per-render registry created by the renderer. A fresh instance is created for
 * every render, so concurrent renders never share mutable state. `defineEmail`
 * reaches it through the async-local render scope.
 */
export interface EmailRenderContext {
  readonly [EMAIL_RENDER_BRAND]: true
  metadata?: {
    subject?: () => string
    text?: () => string
  }
  /**
   * Tailwind regions registered by `<ETailwind>` boundaries during render, in
   * registration order. Consumed by the post-render pass to complete each head
   * `<style>` and inline nested plain elements. Absent when no boundary rendered.
   */
  tailwindRegions?: TailwindRegion[]
}

export class DefineEmailOutsideRenderError extends Error {
  constructor() {
    super('defineEmail() must be called during an email render, from an email template rendered by renderEmail().')
    this.name = 'DefineEmailOutsideRenderError'
  }
}

export class DuplicateEmailDefinitionError extends Error {
  constructor() {
    super('defineEmail() may only be called once during one email render.')
    this.name = 'DuplicateEmailDefinitionError'
  }
}

export function createEmailRenderContext(): EmailRenderContext {
  return { [EMAIL_RENDER_BRAND]: true }
}

/**
 * The active email render context, or `undefined` outside a render. Used by
 * `<ETailwind>` to register its region on the same context `renderComponentToHtml`
 * reads back after render.
 */
export function getEmailRenderContext(): EmailRenderContext | undefined {
  return renderContextStorage.getStore()
}

/**
 * Run `fn` (the render) with `context` as the active email render context so any
 * `defineEmail()` call inside the rendered template — sync or after an await —
 * resolves to it.
 */
export function runWithEmailRenderContext<T>(context: EmailRenderContext, fn: () => T): T {
  return renderContextStorage.run(context, fn)
}

function isEmailRenderContext(value: unknown): value is EmailRenderContext {
  return typeof value === 'object'
    && value !== null
    && (value as Partial<EmailRenderContext>)[EMAIL_RENDER_BRAND] === true
}

/**
 * Declare subject and/or authored plain text from an email template's
 * `<script setup>`. A zero-argument closure captures the template's real
 * `defineProps()` value, so there is no separate generic that can lie about the
 * template contract.
 *
 * Must run during an email render; calling it elsewhere throws
 * {@link DefineEmailOutsideRenderError}.
 */
export function defineEmail(options: DefineEmailOptions): void {
  const context = renderContextStorage.getStore()
  if (!isEmailRenderContext(context)) {
    throw new DefineEmailOutsideRenderError()
  }

  if (context.metadata) {
    throw new DuplicateEmailDefinitionError()
  }

  if (!options || typeof options !== 'object') {
    throw new TypeError('defineEmail() requires subject or text metadata.')
  }

  const keys = Object.keys(options)
  const unsupportedKeys = keys.filter(key => key !== 'subject' && key !== 'text')
  if (unsupportedKeys.length > 0) {
    throw new TypeError(`defineEmail() received unsupported metadata: ${unsupportedKeys.sort().join(', ')}.`)
  }
  if (options.subject === undefined && options.text === undefined) {
    throw new TypeError('defineEmail() requires subject or text metadata.')
  }

  const toFactory = (name: 'subject' | 'text', value: EmailMetadataValue | undefined) => {
    if (value === undefined) return undefined
    if (typeof value === 'string') return () => value
    if (typeof value === 'function') return value
    throw new TypeError(`defineEmail() ${name} must be a string or a function returning a string.`)
  }

  context.metadata = {
    subject: toFactory('subject', options.subject),
    text: toFactory('text', options.text),
  }
}
