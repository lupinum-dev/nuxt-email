import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  try {
    // @ts-expect-error fixture intentionally exercises the runtime unknown-name guard
    await renderEmail('not-registered', {})
  }
  catch (error) {
    return {
      knownNames: typeof error === 'object' && error !== null && 'knownNames' in error
        ? error.knownNames
        : undefined,
      message: error instanceof Error ? error.message : undefined,
      name: error instanceof Error ? error.name : undefined,
      requestedName: typeof error === 'object' && error !== null && 'requestedName' in error
        ? error.requestedName
        : undefined,
    }
  }

  throw new Error('Expected an unknown email template name to fail')
})
