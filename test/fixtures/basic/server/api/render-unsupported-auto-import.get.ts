import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  try {
    await renderEmail('unsupported-auto-import', {})
  }
  catch (error) {
    return {
      cause: error instanceof Error && error.cause instanceof Error
        ? error.cause.message
        : undefined,
      name: error instanceof Error ? error.name : undefined,
    }
  }

  throw new Error('Expected a bare Vue API in an email SFC to fail')
})
