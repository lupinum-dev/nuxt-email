import type { EmailComponentProps, RenderedEmail } from '@lupinum/nuxt-email'
import { EmailRenderError, UnknownEmailTemplateError } from '@lupinum/nuxt-email/errors'
// Type-only: the test renderer compiles templates and never runs inside the server bundle.
import type { createTestRenderer } from '@lupinum/nuxt-email/testing'
import type { EmailTemplateProps } from '#nuxt-email/registry'
import type WelcomeEmail from '../../app/emails/welcome.vue'

type TestRenderer = Awaited<ReturnType<typeof createTestRenderer<EmailTemplateProps>>>

export function provePublicSubpathTypes(testRenderer: TestRenderer): void {
  void EmailRenderError
  void UnknownEmailTemplateError
  const fixture: EmailComponentProps<typeof WelcomeEmail> = {
    orderNumber: 7319,
    recipientName: 'Ada',
  }
  const rendered: Promise<RenderedEmail> = testRenderer.renderEmail('welcome', fixture)
  void rendered
  // @ts-expect-error the test renderer reads required props from the generated types
  void testRenderer.renderEmail('welcome', { recipientName: 'Ada' })
  // @ts-expect-error only discovered template names are accepted
  void testRenderer.renderEmail('missing-template', fixture)
}
