import { emailTemplates } from '#nuxt-email/registry'
import { defineEventHandler, setHeaders } from 'h3'

export default defineEventHandler((event) => {
  setHeaders(event, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
  })

  return {
    templates: Object.entries(emailTemplates)
      .map(([name, template]) => ({
        name,
        hasFixture: typeof template.fixture === 'function',
      }))
      .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0),
  }
})
