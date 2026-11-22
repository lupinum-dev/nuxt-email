import { defineEventHandler } from 'h3'

export default defineEventHandler(async () => {
  const props = {
    source: 'const answer: string = "<script>"',
  }
  const [production, concurrent] = await Promise.all([
    renderEmail('code-example', props),
    Promise.all([
      renderEmail('code-example', props),
      renderEmail('code-example', props),
    ]),
  ])

  return {
    concurrentEqual: concurrent[0].html === concurrent[1].html && concurrent[0].html === production.html,
    production,
  }
})
