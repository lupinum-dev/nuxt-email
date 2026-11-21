import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  try {
    return await renderEmail('server-auto-import', {})
  }
  catch (error) {
    return { error: error instanceof Error ? `${error.name}: ${error.cause instanceof Error ? error.cause.message : error.message}` : String(error) }
  }
})
