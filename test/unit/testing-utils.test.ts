import { watch } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { EmailRenderError as PublicEmailRenderError } from '../../src/runtime/errors'
import { createTestRenderer, EmailRenderError, UnknownEmailTemplateError } from '../../src/testing'

const fixtures = fileURLToPath(new URL('../fixtures', import.meta.url))

describe('@lupinum/nuxt-email/testing: createTestRenderer', () => {
  it('throws the exported error classes from the compiled registry', async () => {
    expect(EmailRenderError).toBe(PublicEmailRenderError)
    const { renderEmail } = await createTestRenderer({ rootDir: `${fixtures}/standalone`, templatesDir: 'emails' })

    await expect(renderEmail('missing')).rejects.toBeInstanceOf(UnknownEmailTemplateError)
    await expect(renderEmail('welcome', { name: 'Ada', items: [] })).rejects.toBeInstanceOf(EmailRenderError)
    expect((await renderEmail('plain-email')).subject).toBe('Plain email')
  }, 30_000)

  // A component outside app/emails that a template imports through `~` gets its classes:
  // the style table is built from the files the build read, not from app/emails alone.
  it('resolves the classes of a component imported from outside the email directory', async () => {
    const { renderEmail } = await createTestRenderer({ rootDir: `${fixtures}/basic` })

    const email = await renderEmail('shared-component', {})
    expect(email.html).toContain('OUTSIDE_COMPONENT_7D2A')
    expect(email.html).toContain('<p style="font-size:14px;line-height:24px;letter-spacing:.1em;margin-top:16px;margin-bottom:16px;">')
  }, 30_000)

  // Like a Nuxt app with `srcDir: 'src'`: `~` is the parent of the email directory.
  it('resolves ~ from the parent of templatesDir', async () => {
    const { renderEmail } = await createTestRenderer({ rootDir: `${fixtures}/src-dir`, templatesDir: 'src/emails' })

    expect((await renderEmail('src-note')).html).toContain('SRC_DIR_COMPONENT_3B9E')
  }, 30_000)

  // A killed test run must not leave a compiled registry in the project files.
  it('writes its temporary registry outside the project files', async () => {
    const rootDir = `${fixtures}/src-dir`
    const written: string[] = []
    const watcher = watch(rootDir, (_event, name) => {
      if (name !== null && name !== 'node_modules') written.push(name)
    })
    try {
      await createTestRenderer({ rootDir, templatesDir: 'src/emails' })
    }
    finally {
      watcher.close()
    }
    expect(written).toEqual([])
  }, 30_000)

  it('renders ECodeBlock with the module codeBlock option and rejects it without', async () => {
    const options = { rootDir: `${fixtures}/code-block` }
    const { renderEmail } = await createTestRenderer({ ...options, codeBlock: { languages: ['typescript'], theme: 'github-dark' } })

    const email = await renderEmail('code-example', { source: 'const answer = 42' })
    expect(email.html).toContain('data-code-theme="github-dark"')
    expect(email.text).toBe('const answer = 42')
    await expect(createTestRenderer(options)).rejects.toThrow('needs the nuxtEmail codeBlock module option')
  }, 30_000)
})
