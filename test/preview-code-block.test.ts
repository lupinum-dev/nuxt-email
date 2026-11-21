import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('development preview with configured code blocks', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/code-block', import.meta.url)),
    dev: true,
    serverStartTimeout: 180_000,
  })

  it('renders configured code blocks through the production registry', async () => {
    expect(await $fetch('/__email')).toContain('NUXT_EMAIL_PREVIEW_PAGE_V01')
    const rendered = await $fetch<{
      concurrentEqual: boolean
      production: { html: string }
    }>('/api/render-code')
    expect(rendered.concurrentEqual).toBe(true)
    expect(rendered.production.html).toContain('answer')
  })
})
