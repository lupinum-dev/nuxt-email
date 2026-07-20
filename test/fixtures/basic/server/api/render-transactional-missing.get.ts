import { defineEventHandler } from 'h3'
import TransactionalEmail from '../../app/emails/TransactionalEmail.vue'
import { renderEmailComponent } from '../../../../../src/runtime/core'

export default defineEventHandler(async () => {
  try {
    await renderEmailComponent(TransactionalEmail, {
      activationUrl: 'https://example.com/activate',
      logoUrl: 'https://example.com/logo.png',
    })
  }
  catch (error) {
    const cause = error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : undefined

    return {
      cause,
      componentName: typeof error === 'object' && error !== null && 'componentName' in error
        ? error.componentName
        : undefined,
      name: error instanceof Error ? error.name : undefined,
    }
  }

  throw new Error('Expected the compiled email fixture to reject a missing required prop')
})
