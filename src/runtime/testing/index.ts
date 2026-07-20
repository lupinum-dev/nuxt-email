/**
 * First-class testing utilities for nuxt-email templates.
 *
 * Import from the `nuxt-email/testing` subpath to render and assert on your
 * emails in a unit test without booting a Nuxt app:
 *
 * ```ts
 * import { renderEmailComponent, normalizeEmailHtml } from 'nuxt-email/testing'
 * ```
 */
export { renderEmailComponent } from '../render/render-email-component'
export type { RenderedEmail } from '../render/types'
export { normalizeEmailHtml } from './normalize'
