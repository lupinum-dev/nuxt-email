import WelcomeEmail from '../../app/emails/welcome.vue'
import { defineEmail } from '@lupinum/nuxt-email/define-email'
import {
  DefineEmailOutsideRenderError,
  DuplicateEmailDefinitionError,
  EmailRenderError,
  TailwindMissingHeadError,
  UnknownEmailTemplateError,
} from '@lupinum/nuxt-email/errors'
import { normalizeEmailHtml, renderEmailComponent } from '@lupinum/nuxt-email/testing'
import { dracula, oneDark } from '@lupinum/nuxt-email/themes'

export function provePublicSubpathTypes(): void {
  void defineEmail
  void DefineEmailOutsideRenderError
  void DuplicateEmailDefinitionError
  void EmailRenderError
  void TailwindMissingHeadError
  void UnknownEmailTemplateError
  void normalizeEmailHtml
  void dracula
  void oneDark

  void renderEmailComponent(WelcomeEmail, {
    orderNumber: 7319,
    recipientName: 'Ada',
  })
  // @ts-expect-error the direct testing helper infers required SFC props
  void renderEmailComponent(WelcomeEmail, { recipientName: 'Ada' })
}
