import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildEmailRegistry } from '../src/build'
import type { RenderedEmail } from '../src/runtime/render-email'
import { createTestRenderer } from '../src/testing'

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

  it('applies tailwind.css theme colours and keeps responsive rules in the head', async () => {
    const { html } = await renderEmail('welcome', { name: 'Ada', destination: 'https://example.test', items: [] })
    expect(html).toContain('color:#00dc82')
    expect(html).toContain('class="sm_text-2xl"')
    expect(html).toContain('<style>@media (min-width:640px){.sm_text-2xl{font-size:24px!important;line-height:1.3333333333333333!important}}</style>')
  })

  it('renders the same bytes as createTestRenderer for the same directory', async () => {
    const tested = await createTestRenderer({ rootDir: temporary })
    const props = { name: '<Ada & Grace>', destination: 'https://example.test/account?a=1&b=2', items: ['First'], brand: 'blue' }
    expect(await tested.renderEmail('welcome', props)).toEqual(await renderEmail('welcome', props))
    expect(await tested.renderEmail('plain-email', {})).toEqual(await renderEmail('plain-email', {}))
  })

  it('rejects a missing required prop', async () => {
    await expect(renderEmail('welcome', { name: 'Ada', items: [] })).rejects.toMatchObject({
      name: 'EmailRenderError',
      cause: { message: 'Missing required email component prop: destination' },
    })
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

  it('retains child utilities through a class prop listed in source', async () => {
    for (const { variant, owner, rule } of [
      { variant: '*:bg-red-500', owner: '__bg-red-500', rule: '.__bg-red-500>*{background-color:#fb2c36!important}' },
      { variant: '**:text-blue-500', owner: '___text-blue-500', rule: '.___text-blue-500 *{color:#2b7fff!important}' },
      { variant: 'sm:bg-red-500', owner: 'sm_bg-red-500', rule: '@media (min-width:640px){.sm_bg-red-500{background-color:#fb2c36!important}}' },
    ]) {
      const { html } = await renderEmail('css-variants', { variant })
      const style = html.match(/<style>(.*?)<\/style>/s)?.[1]
      expect(style, variant).toContain(rule)
      // The rule only applies when the element that owns it keeps the sanitized class.
      expect(html, variant).toMatch(new RegExp(`<p[^>]* class="${owner}"[^>]*><span>Child content</span>`))
      // A conditional declaration must not leak into inline styles, where it would always apply.
      expect(html.replace(/<style>.*?<\/style>/s, ''), variant).not.toMatch(/style="[^"]*(background-color|color:rgb\(43)/)
    }
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
    expect(before).not.toMatch(/NUXT_EMAIL_STANDALONE_FIXTURE_SECRET|vue-tsc|compiler-sfc|\/testing/)
    const imports = new Set([...before.matchAll(/^import .* from "([^"]+)";?$/gm)].map(match => match[1]))
    expect([...imports].sort()).toEqual(['@lupinum/nuxt-email/render', 'vue'])
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

  // Without this check, vue-tsc rejects the import with TS6059 or TS2307, which does not say that
  // the standalone build supports only a self-contained email directory.
  it('rejects an import from outside the email directory with the importing file and path', async () => {
    const shared = join(temporary, 'app/shared')
    await mkdir(shared, { recursive: true })
    await writeFile(join(shared, 'Badge.vue'), '<template><span class="font-bold">Badge</span></template>')
    const invalid = join(directory, 'outside-import.vue')
    await writeFile(invalid, '<script setup lang="ts">import Badge from "../shared/Badge.vue"</script><template><EEmail subject="x" lang="en"><Badge /></EEmail></template>')
    try {
      await expect(buildEmailRegistry({ rootDir: temporary, outDir })).rejects.toThrow(
        `${invalid} imports "../shared/Badge.vue" from outside the email directory.`,
      )
    }
    finally {
      await rm(invalid)
      await rm(shared, { recursive: true })
    }
  }, 30_000)

  // esbuild keeps `~/…` external like a package, so without the check vue-tsc fails later with TS2307.
  it('rejects a Nuxt alias import with the importing file and path', async () => {
    const invalid = join(directory, 'alias-import.vue')
    await writeFile(invalid, '<script setup lang="ts">import Badge from "~/components/Badge.vue"</script><template><EEmail subject="x" lang="en"><Badge /></EEmail></template>')
    try {
      await expect(buildEmailRegistry({ rootDir: temporary, outDir })).rejects.toThrow(
        `${invalid} imports "~/components/Badge.vue", a Nuxt alias.`,
      )
    }
    finally {
      await rm(invalid)
    }
  }, 30_000)

  it.each([
    ['<template><EEmail subject="x" lang="en" class="@sm:bg-red-500" /></template>', '@container rules are not supported'],
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
