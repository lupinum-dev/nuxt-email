import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('ssr', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders the index page', async () => {
    const html = await $fetch('/')
    expect(html).toContain('<div>basic</div>')
  })

  it('compiles and renders a Vue SFC inside Nitro', async () => {
    const html = await $fetch('/api/render')

    expect(html).toBe('<main data-email-proof> Hello Ada</main>')
  })

  it('renders the fixed transactional SFC through the canonical renderer', async () => {
    const result = await $fetch<{ html: string, text: string }>('/api/render-transactional')

    expect(result.html).toContain('<title>Activate your Nuxt Email account</title>')
    expect(result.html).toContain('Welcome, Ada')
    expect(result.html).toContain('<!--[if mso]>')
    expect(result.html).toContain('text-align:center')
    expect(result.html).toContain('href="https://example.com/activate?token=fixture&amp;source=email"')
    expect(result.text).toContain('Activate account https://example.com/activate?token=fixture&source=email')
    expect(result.text).not.toContain('Your account is ready — activate it now.')
  })

  it('rejects a missing required prop declared by a compiled Vue SFC', async () => {
    const result = await $fetch<{
      cause: string
      componentName: string
      name: string
    }>('/api/render-transactional-missing')

    expect(result).toEqual({
      cause: 'Missing required email component prop: firstName',
      componentName: 'TransactionalEmail',
      name: 'EmailRenderError',
    })
  })
})
