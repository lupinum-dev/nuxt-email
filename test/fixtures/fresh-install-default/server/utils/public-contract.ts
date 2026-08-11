import type { RenderedEmail } from '@lupinum/nuxt-email'
import { renderEmailComponent } from '@lupinum/nuxt-email/testing'
import WelcomeEmail from '../../app/emails/welcome.vue'

export function provePublicTypes(): void {
  const rendered: Promise<RenderedEmail> = renderEmailComponent(WelcomeEmail, {
    orderNumber: 7319,
    recipientName: 'Ada',
  })
  void rendered
}
