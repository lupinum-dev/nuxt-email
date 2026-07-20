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

  it('renders a no-import Vue SFC through the typed canonical registry', async () => {
    const result = await $fetch<{ html: string, text: string }>('/api/render-transactional')

    expect(result.html).toContain('<title>Activate your Nuxt Email account</title>')
    expect(result.html).toContain('NUXT_EMAIL_SERVER_ONLY_TEMPLATE_7F4C')
    expect(result.html).toContain('Welcome, Ada')
    expect(result.html).toContain('<!--[if mso]>')
    expect(result.html).toContain('text-align:center')
    expect(result.html).toContain('href="https://example.com/activate?token=fixture&amp;source=email"')
    expect(result.text).toContain('Activate account https://example.com/activate?token=fixture&source=email')
    expect(result.text).not.toContain('Your account is ready — activate it now.')
  })

  it('recursively discovers and renders nested template names', async () => {
    const result = await $fetch<{ html: string, text: string }>('/api/render-reset')

    expect(result.html).toContain('<title>Reset your password</title>')
    expect(result.html).toContain('VUE-2048')
    expect(result.text).toContain('Use code VUE-2048 within 15 minutes.')
    expect(result.text).toContain('This nested template was discovered recursively.')
    expect(result.text).not.toContain('Your password reset code is VUE-2048.')
  })

  it('reports deterministic known names and excludes app/emails/components', async () => {
    const result = await $fetch<{
      knownNames: string[]
      message: string
      name: string
      requestedName: string
    }>('/api/render-unknown')

    expect(result).toEqual({
      knownNames: ['account/reset-password', 'transactional'],
      message: 'Unknown email template "not-registered"; known templates: account/reset-password, transactional',
      name: 'UnknownEmailTemplateError',
      requestedName: 'not-registered',
    })
  })

  it('rejects a missing required prop declared by a compiled Vue SFC', async () => {
    const result = await $fetch<{
      cause: string
      componentName: string
      name: string
    }>('/api/render-transactional-missing')

    expect(result).toEqual({
      cause: 'Missing required email component prop: firstName',
      componentName: 'transactional',
      name: 'EmailRenderError',
    })
  })
})
