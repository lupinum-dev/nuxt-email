import type { TailwindRegion } from '../tailwind/nested'
import { AsyncLocalStorage } from 'node:async_hooks'

/**
 * Options declared by an email template via {@link defineEmail}.
 *
 * `subject` receives the SAME props object that `renderEmail(name, props)` was
 * called with and returns the computed subject line.
 */
export interface DefineEmailOptions<TProps> {
  subject: (props: TProps) => string
}

const EMAIL_RENDER_BRAND = Symbol('nuxt-email:render-context')

/**
 * Per-render context propagated across `await` boundaries. `useSSRContext()` is
 * built on Vue's `inject()`, which loses the active component instance after the
 * first `await` in an async `<script setup>`, so `defineEmail()` called after a
 * top-level `await` (e.g. `const user = await fetchUser()` before declaring the
 * subject) would fail. `AsyncLocalStorage` follows the async execution instead, so
 * `defineEmail()` reaches the right context whether it runs before or after an
 * await, and concurrent renders each see their own store.
 */
const renderContextStorage = new AsyncLocalStorage<EmailRenderContext>()

/**
 * Per-render registry provided to the SSR app. A fresh instance is created for
 * every render, so concurrent renders never share mutable state. `defineEmail`
 * writes into the branded context that Vue exposes through `useSSRContext()`.
 */
export interface EmailRenderContext {
  readonly [EMAIL_RENDER_BRAND]: true
  subject?: (props: Record<string, unknown>) => string
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
 * Declare email metadata (currently the subject) from an email template's
 * `<script setup>`. The subject is computed from the same typed props passed to
 * `renderEmail`, and surfaces on the render result as `subject`.
 *
 * Must run during an email render; calling it elsewhere throws
 * {@link DefineEmailOutsideRenderError}.
 */
export function defineEmail<TProps = Record<string, unknown>>(options: DefineEmailOptions<TProps>): void {
  const context = renderContextStorage.getStore()
  if (!isEmailRenderContext(context)) {
    throw new DefineEmailOutsideRenderError()
  }

  context.subject = options.subject as (props: Record<string, unknown>) => string
}
