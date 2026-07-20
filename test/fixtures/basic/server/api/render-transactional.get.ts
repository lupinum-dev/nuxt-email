import { defineEventHandler } from 'h3'
import TransactionalEmail from '../../app/emails/TransactionalEmail.vue'
import { renderEmailComponent } from '../../../../../src/runtime/core'

export default defineEventHandler(() => {
  return renderEmailComponent(TransactionalEmail, {
    activationUrl: 'https://example.com/activate?token=fixture&source=email',
    firstName: 'Ada',
    logoUrl: 'https://example.com/logo.png',
  })
})
