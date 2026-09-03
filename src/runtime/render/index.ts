/** Server-only production rendering of already compiled Vue components. */
export { renderEmailComponent } from './render-email-component'
export { EmailRenderError } from './errors'
export { UnknownEmailTemplateError } from '../template-registry/errors'
export type { EmailComponentProps, RenderedEmail } from './types'
export type EmailComponents = typeof import('../components/email-component-registry').emailComponentRegistry
