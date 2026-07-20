import { useSSRContext } from 'vue'

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
 * Per-render registry provided to the SSR app. A fresh instance is created for
 * every render, so concurrent renders never share mutable state. `defineEmail`
 * writes into the branded context that Vue exposes through `useSSRContext()`.
 */
export interface EmailRenderContext {
  readonly [EMAIL_RENDER_BRAND]: true
  subject?: (props: Record<string, unknown>) => string
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
  const context = useSSRContext<Partial<EmailRenderContext>>()
  if (!isEmailRenderContext(context)) {
    throw new DefineEmailOutsideRenderError()
  }

  context.subject = options.subject as (props: Record<string, unknown>) => string
}
