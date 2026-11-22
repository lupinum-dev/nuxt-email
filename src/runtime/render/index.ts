/** What a generated email registry imports, plus the public render types. */
export { createEmailRenderer } from '../render-email'
export { EmailRenderError } from './errors'
export { UnknownEmailTemplateError } from '../template-registry/errors'
export type { EmailComponentProps, EmailRenderArgs, RenderedEmail } from '../render-email'
export type EmailComponents = typeof import('../components/email-components').emailComponents
