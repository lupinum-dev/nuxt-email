import { renderEmailComponent } from '#nuxt-email/testing'
import { expect, it } from 'vitest'
import ConfiguredEmail from './configured-email.vue'

it('renders an SFC through the Nuxt-configured testing alias', async () => {
  const rendered = await renderEmailComponent(ConfiguredEmail, {
    source: 'const answer: number = 42',
  })

  expect(rendered.html).toContain('data-code-theme="github-dark"')
  expect(rendered.text).toBe('const answer: number = 42')
})
