import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return renderEmail('transactional', {
    activationUrl: 'https://example.com/activate?token=fixture&source=email',
    firstName: 'Ada',
    logoUrl: 'https://example.com/logo.png',
  })
})
