import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $fetch, createTest, fetch as testFetch, setupMaps } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const sourceFixtureRoot = fileURLToPath(new URL('./fixtures/preview', import.meta.url))
const temporaryFixtureRoot = fileURLToPath(new URL('../.tmp/', import.meta.url))
await mkdir(temporaryFixtureRoot, { recursive: true })
// The development server can still write type files into its build directory after it
// closed. Removing the directories at teardown then fails the run with an unhandled
// ENOENT (seen on macOS). So a run keeps its directories, and a later run removes them
// here; one hour keeps the directories of a run that is still in progress.
for (const entry of await readdir(temporaryFixtureRoot, { withFileTypes: true })) {
  if (!entry.isDirectory() || !entry.name.startsWith('preview-test-')) continue
  const directory = join(temporaryFixtureRoot, entry.name)
  if (Date.now() - (await stat(directory)).mtimeMs < 60 * 60 * 1000) continue
  await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }).catch(() => {})
}
const fixtureRoot = await mkdtemp(join(temporaryFixtureRoot, 'preview-test-'))
const buildRoot = join(temporaryFixtureRoot, `${basename(fixtureRoot)}-build`)
// Nuxt Test Utils removes a build directory that it creates itself. Precreating it
// keeps the directory until a later run.
await mkdir(buildRoot, { recursive: true })
await cp(sourceFixtureRoot, fixtureRoot, {
  recursive: true,
  filter: source => !['.nuxt', '.output', 'node_modules'].includes(basename(source)),
})
const nuxtConfigPath = join(fixtureRoot, 'nuxt.config.ts')
const nuxtConfigSource = await readFile(nuxtConfigPath, 'utf8')
await writeFile(
  nuxtConfigPath,
  nuxtConfigSource.replace('../../../src/module', new URL('../src/module.ts', import.meta.url).href),
)
const welcomeTemplate = join(fixtureRoot, 'app/emails/welcome.vue')
const welcomeFixture = join(fixtureRoot, 'app/emails/welcome.fixtures.ts')
// Outside app/emails; welcome.vue imports it through `~`.
const sharedComponent = join(fixtureRoot, 'app/components/PreviewFooter.vue')
const tailwindCss = join(fixtureRoot, 'app/emails/tailwind.css')
const fixturelessFixture = join(fixtureRoot, 'app/emails/without-fixture.fixtures.ts')

async function renderedHtmlDuringReload(name: string) {
  const response = await testFetch(`/sub/__email/render?name=${name}&format=json`, {
    signal: AbortSignal.timeout(1_000),
  }).catch(() => undefined)
  if (!response) return ''
  if (response.status === 500) return ''
  if (!response.ok) {
    throw new Error(`Preview render returned HTTP ${response.status}.`)
  }
  return (await response.json() as { html: string }).html
}

async function fixtureDuringReload(name: string) {
  const response = await testFetch('/sub/__email/api/templates', {
    signal: AbortSignal.timeout(1_000),
  }).catch(() => undefined)
  if (!response?.ok) return undefined
  const result = await response.json() as { templates: Array<{ name: string, hasFixture: boolean }> }
  return result.templates.find(template => template.name === name)?.hasFixture
}

describe('development email preview', async () => {
  const test = createTest({
    dev: true,
    // Keep this outside the Windows ephemeral range and away from the
    // production-mode fixture on 32081. This avoids both adjacent internal
    // ports and the probe-then-bind race in Nuxt Test Utils on Windows.
    port: 32_181,
    rootDir: fixtureRoot,
    // A cold Windows development build can take more than the test utility's
    // 120-second default when hosted runners are under load. Keep a finite
    // budget below the 240-second Windows setup timeout.
    serverStartTimeout: 180_000,
    // Outside the copied fixture, and precreated above so that nothing removes it
    // while the server can still write to it.
    nuxtConfig: {
      buildDir: buildRoot,
    },
  })
  await setupMaps.vitest(test)

  it('serves the preview page with its security headers under the app base URL', async () => {
    const response = await testFetch('/sub/__email')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-security-policy')).toContain('frame-src \'self\'')
    // The Nuxt DevTools tab frames the page from the same origin.
    expect(response.headers.get('content-security-policy')).toContain('frame-ancestors \'self\'')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('lists every canonical template and its fixture availability', async () => {
    const result = await $fetch<{
      templates: Array<{ name: string, hasFixture: boolean }>
    }>('/sub/__email/api/templates')

    expect(result.templates).toEqual([
      { name: 'broken', hasFixture: true },
      { name: 'kept-classes', hasFixture: true },
      { name: 'welcome', hasFixture: true },
      { name: 'without-fixture', hasFixture: false },
    ])
  })

  it('matches canonical direct rendering in JSON and raw HTML views', async () => {
    const preview = await $fetch<{ name: string, html: string, text: string, bytes: number, unknownClasses: string[] }>(
      '/sub/__email/render?name=welcome&format=json',
    )
    const direct = await $fetch<{ html: string, text: string }>('/sub/api/direct-render')
    const raw = await testFetch('/sub/__email/render?name=welcome')
    const rawHtml = await raw.text()

    const { bytes, unknownClasses, ...previewOutput } = preview
    expect(previewOutput).toEqual({ name: 'welcome', ...direct })
    expect(unknownClasses).toEqual([])
    expect(bytes).toBe(Buffer.byteLength(preview.html, 'utf8'))
    expect(rawHtml).toBe(preview.html)
    expect(raw.headers.get('cache-control')).toBe('no-store')
    expect(raw.headers.get('content-type')).toContain('text/html')
    expect(raw.headers.get('content-security-policy')).toContain('script-src \'none\'')
    expect(raw.headers.get('content-security-policy')).toContain('object-src \'none\'')
  })

  it('returns the subject from the EEmail root', async () => {
    const welcome = await $fetch<{ subject: string }>(
      '/sub/__email/render?name=welcome&format=json',
    )

    expect(welcome.subject).toBe('Welcome, Ada')
  })

  it('reports the classes a render kept as written', async () => {
    const unknownClasses = async (name: string) => (await $fetch<{ unknownClasses: string[] }>(`/sub/__email/render?name=${name}&format=json`)).unknownClasses

    expect(await unknownClasses('kept-classes')).toEqual(['brand-footer', 'ring-blue-500'])
    expect(await unknownClasses('welcome')).toEqual([])
  })

  it('returns actionable development errors and rejects fixtureless templates', async () => {
    const broken = await testFetch('/sub/__email/render?name=broken&format=json')
    const brokenBody = await broken.json() as {
      data: {
        error: {
          name: string
          message: string
          stack: string
          templateName: string
          cause: { name: string, message: string, stack: string }
        }
      }
    }
    const fixtureless = await testFetch('/sub/__email/render?name=without-fixture&format=json')

    expect(broken.status).toBe(500)
    expect(brokenBody.data.error.templateName).toBe('broken')
    expect(brokenBody.data.error.name).toBe('EmailRenderError')
    expect(brokenBody.data.error.stack).toContain('EmailRenderError')
    expect(brokenBody.data.error.cause.message).toContain('Preview fixture failed: intentional test failure')
    expect(fixtureless.status).toBe(404)
  })

  it('reflects template edits without restarting the development server', async () => {
    const originalSource = await readFile(welcomeTemplate, 'utf8')
    const updatedSource = originalSource.replace('PREVIEW_VERSION_ONE', 'PREVIEW_VERSION_TWO_AFTER_RELOAD')

    try {
      await writeFile(welcomeTemplate, updatedSource)
      await expect.poll(() => renderedHtmlDuringReload('welcome'), {
        interval: 100,
        timeout: 20_000,
      }).toContain('PREVIEW_VERSION_TWO_AFTER_RELOAD')
    }
    finally {
      await writeFile(welcomeTemplate, originalSource)
    }
    // Rebuild latency under a fully parallel suite exceeds the 5s default budget,
    // and the poll window must fit inside the test's own timeout.
  }, 30_000)

  it('rebuilds the style table when a template adds a class no template used before', async () => {
    const originalSource = await readFile(welcomeTemplate, 'utf8')
    expect(originalSource).not.toContain('text-rose-700')
    const updatedSource = originalSource.replace('<EText>PREVIEW_VERSION_ONE', '<EText class="text-rose-700">PREVIEW_VERSION_ONE')
    expect(updatedSource).not.toBe(originalSource)

    try {
      await writeFile(welcomeTemplate, updatedSource)
      await expect.poll(() => renderedHtmlDuringReload('welcome'), {
        interval: 100,
        timeout: 20_000,
      }).toContain('color:#c70036')
    }
    finally {
      await writeFile(welcomeTemplate, originalSource)
    }
  }, 30_000)

  // Catches a stale registry or style table after an edit to a file outside app/emails
  // that a template imports: it must reload like a template file.
  it('rebuilds after a class edit in a component imported from outside app/emails', async () => {
    const originalSource = await readFile(sharedComponent, 'utf8')
    const updatedSource = originalSource.replace('text-sky-700', 'text-emerald-700')
    expect(updatedSource).not.toBe(originalSource)
    expect(await renderedHtmlDuringReload('welcome')).toContain('color:#0069a8')

    try {
      await writeFile(sharedComponent, updatedSource)
      await expect.poll(() => renderedHtmlDuringReload('welcome'), {
        interval: 100,
        timeout: 20_000,
      }).toContain('color:#007a55')
    }
    finally {
      await writeFile(sharedComponent, originalSource)
    }
  }, 30_000)

  it('refreshes edited fixture data without restarting the development server', async () => {
    const originalSource = await readFile(welcomeFixture, 'utf8')
    const updatedSource = originalSource.replace('firstName: \'Ada\'', 'firstName: \'Grace\'')

    try {
      await writeFile(welcomeFixture, updatedSource)
      await expect.poll(() => renderedHtmlDuringReload('welcome'), {
        interval: 100,
        timeout: 20_000,
      }).toContain('Welcome, Grace')
    }
    finally {
      await writeFile(welcomeFixture, originalSource)
    }
  }, 30_000)

  // Rename and delete are covered at the hook level in module-registry.test.ts.
  it('picks up a template added while the development server runs', async () => {
    const addedTemplate = join(fixtureRoot, 'app/emails/dynamic.vue')
    const addedFixture = join(fixtureRoot, 'app/emails/dynamic.fixtures.ts')
    try {
      await writeFile(addedFixture, 'export default {}\n')
      await writeFile(addedTemplate, '<template><EEmail subject="Dynamic" lang="en"><EText>DYNAMIC_REGISTRY_TEMPLATE</EText></EEmail></template>')
      await expect.poll(() => renderedHtmlDuringReload('dynamic'), {
        interval: 100,
        timeout: 20_000,
      }).toContain('DYNAMIC_REGISTRY_TEMPLATE')
    }
    finally {
      await rm(addedTemplate, { force: true })
      await rm(addedFixture, { force: true })
    }
  }, 30_000)

  it('lists a fixture added to an existing template while the development server runs', async () => {
    expect(await fixtureDuringReload('without-fixture')).toBe(false)
    try {
      await writeFile(fixturelessFixture, 'export default {}\n')
      await expect.poll(() => fixtureDuringReload('without-fixture'), { interval: 100, timeout: 20_000 }).toBe(true)
    }
    finally {
      await rm(fixturelessFixture, { force: true })
    }
  }, 30_000)

  it('applies an edited @theme colour in tailwind.css to the next render', async () => {
    const originalSource = await readFile(tailwindCss, 'utf8')
    expect(await renderedHtmlDuringReload('welcome')).toContain('color:#00dc82')
    try {
      await writeFile(tailwindCss, originalSource.replace('#00dc82', '#123456'))
      await expect.poll(() => renderedHtmlDuringReload('welcome'), { interval: 100, timeout: 20_000 }).toContain('color:#123456')
    }
    finally {
      await writeFile(tailwindCss, originalSource)
    }
  }, 30_000)
})
