import { defineEventHandler } from 'h3'
import { renderEmailComponent, type RenderedEmail } from '#nuxt-email/testing'
import CodeExample from '../../app/emails/code-example.vue'

export default defineEventHandler(async () => {
  const props = {
    source: 'const answer: string = "<script>"',
  }
  const [production, configuredTest, concurrent] = await Promise.all([
    renderEmail('code-example', props),
    renderEmailComponent(CodeExample, props),
    Promise.all([
      renderEmail('code-example', props),
      renderEmailComponent(CodeExample, props),
    ]),
  ])
  const configuredTypeProof: RenderedEmail = configuredTest

  return {
    concurrentEqual: concurrent[0].html === concurrent[1].html,
    configuredTest: configuredTypeProof,
    production,
  }
})
