import type { RenderedEmail } from '@lupinum/nuxt-email'
// Type-only: the test renderer compiles templates and never runs inside the server bundle.
import type { createTestRenderer } from '@lupinum/nuxt-email/testing'
import type { EmailTemplateProps } from '#nuxt-email/registry'

type TestRenderer = Awaited<ReturnType<typeof createTestRenderer<EmailTemplateProps>>>

export function provePublicTypes(testRenderer: TestRenderer): void {
  const rendered: Promise<RenderedEmail> = testRenderer.renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada',
  })
  void rendered
}
