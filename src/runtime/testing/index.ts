/**
 * First-class testing utilities for nuxt-email templates.
 *
 * Import from the `@lupinum/nuxt-email/testing` subpath to render and assert on your
 * emails in a unit test without booting a Nuxt app:
 *
 * ```ts
 * import { renderEmailComponent, normalizeEmailHtml } from '@lupinum/nuxt-email/testing'
 * ```
 */
export { renderEmailComponent } from '../render/render-email-component'
export { EmailRenderError } from '../render/errors'
export type { RenderedEmail } from '../render/types'
export { normalizeEmailHtml } from './normalize'
