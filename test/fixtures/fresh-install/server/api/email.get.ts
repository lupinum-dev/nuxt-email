import { UnknownEmailTemplateError } from '@lupinum/nuxt-email/errors'

export function proveGeneratedEmailTypes(): void {
  void renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada',
  })

  // @ts-expect-error orderNumber is required by welcome.vue
  void renderEmail('welcome', { recipientName: 'Ada' })

  void renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada',
    // @ts-expect-error extra props are rejected
    unexpected: true,
  })

  // @ts-expect-error only discovered template names are accepted
  void renderEmail('missing-template', {})
}

export default defineEventHandler(async () => {
  try {
    await renderEmail('missing-template' as 'welcome', {
      orderNumber: 7319,
      recipientName: 'Ada & Lin',
    })
    throw new Error('Unknown template probe unexpectedly rendered')
  }
  catch (error) {
    if (!(error instanceof UnknownEmailTemplateError)) {
      throw new Error('Public UnknownEmailTemplateError lost its production module identity', {
        cause: error,
      })
    }
  }

  return renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada & Lin',
  })
})
