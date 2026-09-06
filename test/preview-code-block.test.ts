import { fileURLToPath } from 'node:url'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

describe('development preview with configured code blocks', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/code-block', import.meta.url)),
    dev: true,
    serverStartTimeout: 180_000,
  })

  it('bundles the generated renderer and shares it with production rendering', async () => {
    expect(await $fetch('/__email')).toContain('NUXT_EMAIL_PREVIEW_PAGE_V01')
    const rendered = await $fetch<{
      concurrentEqual: boolean
      configuredTest: { html: string }
      production: { html: string }
    }>('/api/render-code')
    expect(rendered.configuredTest.html).toBe(rendered.production.html)
    expect(rendered.concurrentEqual).toBe(true)
    expect(rendered.production.html).toContain('answer')
  })
})
