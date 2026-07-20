import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return renderEmail('account/reset-password', {
    code: 'VUE-2048',
    expiresInMinutes: 15,
    optionalNote: 'This nested template was discovered recursively.',
  })
})
