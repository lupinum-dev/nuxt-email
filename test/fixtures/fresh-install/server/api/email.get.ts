import { UnknownEmailTemplateError } from '@lupinum/nuxt-email/errors'
import { renderEmailComponent } from '#nuxt-email/testing'
import WelcomeEmail from '../../app/emails/welcome.vue'

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

  const props = {
    orderNumber: 7319,
    recipientName: 'Ada & Lin',
  }
  const [production, configuredTest] = await Promise.all([
    renderEmail('welcome', props),
    renderEmailComponent(WelcomeEmail, props),
  ])
  if (JSON.stringify(production) !== JSON.stringify(configuredTest)) {
    throw new Error('Configured testing renderer diverged from renderEmail')
  }

  return production
})
