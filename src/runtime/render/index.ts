/** What a generated email registry imports, plus the public render types. */
import type { emailComponents } from '../components/email-components'

export { createEmailRenderer } from '../render-email'
export { EmailRenderError } from './errors'
export { UnknownEmailTemplateError } from '../template-registry/errors'
export type { EmailComponentProps, EmailRenderArgs, RenderedEmail } from '../render-email'
// A static import: the build adds the `.js` extension that Node module resolution needs in the declarations.
export type EmailComponents = typeof emailComponents
