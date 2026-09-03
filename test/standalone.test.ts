import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildEmailRegistry } from '../src/build'
import type { RenderedEmail } from '../src/runtime/render/types'

const execute = promisify(execFile)
const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const fixture = join(root, 'test/fixtures/standalone/emails')

describe('standalone production registry', () => {
  let temporary: string
  let directory: string
  let outDir: string
  let outFile: string
  let renderEmail: (name: string, props: object) => Promise<RenderedEmail>

  beforeAll(async () => {
    temporary = await mkdtemp(join(root, '.standalone-test-'))
    await writeFile(join(temporary, 'tsconfig.json'), '{"extends":"./.nuxt/tsconfig.json"}')
    directory = join(temporary, 'app/emails')
    outDir = join(temporary, 'generated')
    await cp(fixture, directory, { recursive: true })
    outFile = join(outDir, 'index.mjs')
    await buildEmailRegistry({ rootDir: temporary, outDir })
    const registry = await import(pathToFileURL(outFile).href)
    renderEmail = registry.renderEmail
  }, 60_000)

  afterAll(async () => {
    if (temporary) await rm(temporary, { recursive: true, force: true })
  })

  it('renders dynamic content, metadata, Tailwind and imported components', async () => {
    const email = await renderEmail('welcome', {
      name: '<Ada & Grace>', destination: 'https://example.test/account?a=1&b=2',
      items: ['First', 'Second'], brand: 'blue',
    })
    expect(email.subject).toBe('Welcome, <Ada & Grace>')
    expect(email.html).toContain('&lt;Ada &amp; Grace&gt;')
    expect(email.html).toContain('font-weight:700')
    expect(email.html).toContain('blue team')
    expect(email.text).toContain('First')
    expect(email.text).toContain('Second')
    expect(email.text).toContain('https://example.test/account?a=1&b=2')
    expect((await renderEmail('plain-email', {})).text).toContain('A template without a script.')
  })

  it('isolates concurrent async metadata and rejects unknown names/props', async () => {
    const emails = await Promise.all(Array.from({ length: 8 }, (_, index) => renderEmail('welcome', {
      name: `Person ${index}`, destination: 'https://example.test', items: [`Item ${index}`],
    })))
    emails.forEach((email, index) => expect(email.subject).toBe(`Welcome, Person ${index}`))
    await expect(renderEmail('missing', {})).rejects.toThrow('Unknown')
    await expect(renderEmail('welcome', { surprise: true })).rejects.toMatchObject({
      cause: { message: 'Unknown email component prop: surprise' },
    })
  })

  it('emits ordinary TypeScript declarations without requiring source SFC resolution', async () => {
    const check = join(temporary, 'check.mts')
    await writeFile(check, `import { renderEmail } from './generated/index.mjs'
renderEmail('welcome', { name: 'Ada', destination: 'https://example.test', items: [] })
// @ts-expect-error required prop
renderEmail('welcome', { name: 'Ada' })
// @ts-expect-error wrong imported prop type
renderEmail('welcome', { name: 'Ada', destination: 'url', items: [12] })
// @ts-expect-error invalid union
renderEmail('welcome', { name: 'Ada', destination: 'url', items: [], brand: 'red' })
// @ts-expect-error unknown template
renderEmail('missing', {})
`)
    await rename(directory, directory + '-hidden')
    try {
      await execute(process.execPath, [require.resolve('typescript/bin/tsc'), '--noEmit', '--strict', '--skipLibCheck', '--target', 'ES2022', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', check], { cwd: root }).catch((error) => {
        throw new Error(error.stdout, { cause: error })
      })
      expect((await renderEmail('welcome', { name: 'Ada', destination: 'url', items: [] })).subject).toBe('Welcome, Ada')
    }
    finally {
      await rename(directory + '-hidden', directory)
    }
    expect(await readFile(join(outDir, 'types/welcome.vue.d.ts'), 'utf8')).toContain('WelcomeProps')
  }, 30_000)

  it('excludes preview fixtures/compiler imports and rebuilds deterministically', async () => {
    const before = await readFile(outFile, 'utf8')
    expect(before).not.toMatch(/NUXT_EMAIL_STANDALONE_FIXTURE_SECRET|vue-tsc|compiler-sfc|unplugin-vue|\/testing/)
    await buildEmailRegistry({ rootDir: temporary, templatesDir: 'app/emails', outDir })
    expect(await readFile(outFile, 'utf8')).toBe(before)
  }, 30_000)

  it('rejects generated output inside template sources', async () => {
    await expect(buildEmailRegistry({ rootDir: temporary, outDir: join(directory, 'generated') })).rejects.toThrow('outside')
    await expect(buildEmailRegistry({ rootDir: temporary, outDir: '../outside-project' })).rejects.toThrow('inside rootDir')
  })

  it('preserves unrelated directories and the last output after a failed compilation', async () => {
    const unrelated = join(temporary, 'unrelated')
    await mkdir(unrelated)
    await writeFile(join(unrelated, 'keep.txt'), 'user data')
    await expect(buildEmailRegistry({ rootDir: temporary, outDir: unrelated })).rejects.toThrow('not owned')
    expect(await readFile(join(unrelated, 'keep.txt'), 'utf8')).toBe('user data')
    const before = await readFile(outFile, 'utf8')
    const invalid = join(directory, 'invalid.vue')
    await writeFile(invalid, '<script setup lang="ts">const value: string = 42</script><template><p>{{ value }}</p></template>')
    try {
      await expect(buildEmailRegistry({ rootDir: temporary, outDir })).rejects.toThrow('not assignable')
      expect(await readFile(outFile, 'utf8')).toBe(before)
    }
    finally {
      await rm(invalid)
    }
  }, 30_000)

  it.each([
    ['<template><p>Styled</p></template><style>p { color: red }</style>', 'style or custom blocks'],
    ['<script setup lang="ts">import { useRuntimeConfig } from "#imports"; useRuntimeConfig()</script><template><p>Nuxt</p></template>', '#imports'],
  ])('rejects unsupported authoring instead of emitting a fallback', async (source, message) => {
    const invalid = join(directory, 'unsupported.vue')
    await writeFile(invalid, source)
    try {
      await expect(buildEmailRegistry({ rootDir: temporary, outDir })).rejects.toThrow(message)
    }
    finally {
      await rm(invalid)
    }
  }, 30_000)
})
