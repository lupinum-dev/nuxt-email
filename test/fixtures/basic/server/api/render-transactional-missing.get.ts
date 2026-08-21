import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  try {
    // @ts-expect-error fixture proves required props are enforced at compile time
    await renderEmail('transactional', {
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
      templateName: typeof error === 'object' && error !== null && 'templateName' in error
        ? error.templateName
        : undefined,
      name: error instanceof Error ? error.name : undefined,
    }
  }

  throw new Error('Expected the compiled email fixture to reject a missing required prop')
})
