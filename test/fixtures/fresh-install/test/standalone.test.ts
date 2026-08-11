import { renderEmailComponent } from '@lupinum/nuxt-email/testing'
import { expect, it } from 'vitest'
import StandaloneEmail from './standalone-email.vue'

it('renders a Vue SFC through the standalone package helper', async () => {
  const rendered = await renderEmailComponent(StandaloneEmail, { name: 'Ada' })

  expect(rendered.text).toBe('Standalone hello, Ada.')
  expect(rendered.html).toContain('Standalone hello, Ada.')
})
