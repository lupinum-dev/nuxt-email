import WelcomeEmail from '../../app/emails/welcome.vue'
import type { EmailComponentProps, RenderedEmail } from '@lupinum/nuxt-email'
import { defineEmail } from '@lupinum/nuxt-email/define-email'
import {
  DefineEmailOutsideRenderError,
  DuplicateEmailDefinitionError,
  EmailRenderError,
  TailwindMissingHeadError,
  UnknownEmailTemplateError,
} from '@lupinum/nuxt-email/errors'
import { renderEmailComponent } from '@lupinum/nuxt-email/testing'

export function provePublicSubpathTypes(): void {
  void defineEmail
  void DefineEmailOutsideRenderError
  void DuplicateEmailDefinitionError
  void EmailRenderError
  void TailwindMissingHeadError
  void UnknownEmailTemplateError
  const fixture: EmailComponentProps<typeof WelcomeEmail> = {
    orderNumber: 7319,
    recipientName: 'Ada',
  }
  const rendered: Promise<RenderedEmail> = renderEmailComponent(WelcomeEmail, {
    orderNumber: 7319,
    recipientName: 'Ada',
  })
  void fixture
  void rendered
  // @ts-expect-error the direct testing helper infers required SFC props
  void renderEmailComponent(WelcomeEmail, { recipientName: 'Ada' })
}
