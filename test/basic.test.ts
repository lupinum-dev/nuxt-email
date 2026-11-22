import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Nuxt Email module integration', async () => {
  await setup({
    // Nuxt Test Utils probes and then reopens a random port. Windows can assign
    // that released ephemeral port to another process before Nuxt starts.
    port: 32_081,
    rootDir: fileURLToPath(new URL('./fixtures/basic', import.meta.url)),
  })

  it('renders a no-import Vue SFC through the typed canonical registry', async () => {
    const result = await $fetch<{ html: string, text: string, subject: string }>('/api/render-transactional')

    expect(result.subject).toBe('Activate your account, Ada')
    expect(result.html).toContain('<title>Activate your Nuxt Email account</title>')
    expect(result.html).toContain('NUXT_EMAIL_SERVER_ONLY_TEMPLATE_7F4C')
    expect(result.html).toContain('Welcome, Ada')
    expect(result.html).toContain('<!--[if mso]>')
    expect(result.html).toContain('text-align:center')
    expect(result.html).toContain('href="https://example.com/activate?token=fixture&amp;source=email"')
    expect(result.text).toContain('Activate account https://example.com/activate?token=fixture&source=email')
    expect(result.text).not.toContain('Your account is ready — activate it now.')
  })

  it('resolves Tailwind classes and the app/emails/tailwind.css theme at build time', async () => {
    const result = await $fetch<{ html: string }>('/api/render-transactional')

    // `bg-brand` comes from `@theme { --color-brand: #00dc82 }` in tailwind.css.
    expect(result.html).toContain('background-color:#00dc82')
    expect(result.html).toContain('class="sm_text-lg"')
    expect(result.html).toContain(
      '<style>@media (min-width:640px){.sm_text-lg{font-size:18px!important;line-height:1.5555555555555556!important}}</style>',
    )
  })

  it('recursively discovers and renders nested template names', async () => {
    const result = await $fetch<{ html: string, text: string, subject: string }>('/api/render-reset')

    expect(result.subject).toBe('Reset your password')
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
      knownNames: ['account/reset-password', 'server-auto-import', 'shared-component', 'transactional', 'unsupported-auto-import'],
      message: 'Unknown email template "not-registered"; known templates: account/reset-password, server-auto-import, shared-component, transactional, unsupported-auto-import',
      name: 'UnknownEmailTemplateError',
      requestedName: 'not-registered',
    })
  })

  // Pins what a Nuxt app supports in templates today, so a change of the build path cannot drop it.
  it('renders a component imported from outside app/emails through the ~ alias and resolves its classes', async () => {
    const result = await $fetch<{ html: string }>('/api/render-shared-component')

    expect(result.html).toContain('OUTSIDE_COMPONENT_7D2A')
    // The style table comes from every file the build read, so this class resolves.
    expect(result.html).toContain('<p style="font-size:14px;line-height:24px;letter-spacing:.1em;margin-top:16px;margin-bottom:16px;">')
  })

  it('resolves a Nitro auto-import from server/utils in a template script', async () => {
    const result = await $fetch<{ html: string }>('/api/render-server-auto-import')

    expect(result.html).toContain('AUTO_IMPORT_3B9E for Ada')
  })

  it('rejects a missing required prop declared by a compiled Vue SFC', async () => {
    const result = await $fetch<{
      cause: string
      templateName: string
      name: string
    }>('/api/render-transactional-missing')

    expect(result).toEqual({
      cause: 'Missing required email component prop: firstName',
      templateName: 'transactional',
      name: 'EmailRenderError',
    })
  })
})
