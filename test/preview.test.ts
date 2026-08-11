import { cp, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $fetch, createTest, fetch as testFetch, setupMaps } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const sourceFixtureRoot = fileURLToPath(new URL('./fixtures/preview', import.meta.url))
const temporaryFixtureRoot = fileURLToPath(new URL('../.tmp/', import.meta.url))
await mkdir(temporaryFixtureRoot, { recursive: true })
const fixtureRoot = await mkdtemp(join(temporaryFixtureRoot, 'preview-test-'))
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

describe('development email preview', async () => {
  const test = createTest({
    dev: true,
    rootDir: fixtureRoot,
  })
  test.ctx.teardown = [async () => {
    try {
      await rm(fixtureRoot, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 100,
      })
    }
    catch (error) {
      if (process.platform === 'win32' && (error as NodeJS.ErrnoException).code === 'EBUSY') {
        return
      }
      throw error
    }
  }]
  await setupMaps.vitest(test)

  it('serves the standalone sandboxed preview application', async () => {
    const response = await testFetch('/sub/__email')
    const html = await response.text()

    expect(html).toContain('NUXT_EMAIL_PREVIEW_PAGE_V01')
    expect(html).toContain('role="tabpanel" aria-labelledby="tab-preview" sandbox')
    // Surface controls ship with accessible labelling.
    expect(html).toContain('role="group" aria-label="Preview viewport width"')
    expect(html).toContain('id="subject"')
    expect(html).toContain('id="size-badge"')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-security-policy')).toContain('frame-src \'self\'')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('lists every canonical template and its fixture availability', async () => {
    const result = await $fetch<{
      templates: Array<{ name: string, hasFixture: boolean }>
    }>('/sub/__email/api/templates')

    expect(result.templates).toEqual([
      { name: 'broken', hasFixture: true },
      { name: 'welcome', hasFixture: true },
      { name: 'without-fixture', hasFixture: false },
    ])
  })

  it('matches canonical direct rendering in JSON and raw HTML views', async () => {
    const preview = await $fetch<{ name: string, html: string, text: string, bytes: number }>(
      '/sub/__email/render?name=welcome&format=json',
    )
    const direct = await $fetch<{ html: string, text: string }>('/sub/api/direct-render')
    const raw = await testFetch('/sub/__email/render?name=welcome')
    const rawHtml = await raw.text()

    const { bytes, ...previewOutput } = preview
    expect(previewOutput).toEqual({ name: 'welcome', ...direct })
    expect(bytes).toBe(Buffer.byteLength(preview.html, 'utf8'))
    expect(rawHtml).toBe(preview.html)
    expect(raw.headers.get('cache-control')).toBe('no-store')
    expect(raw.headers.get('content-type')).toContain('text/html')
    expect(raw.headers.get('content-security-policy')).toContain('script-src \'none\'')
    expect(raw.headers.get('content-security-policy')).toContain('object-src \'none\'')
  })

  it('reports the exact UTF-8 byte size of the rendered html for the Gmail clipping budget', async () => {
    const preview = await $fetch<{ html: string, bytes: number }>(
      '/sub/__email/render?name=welcome&format=json',
    )

    expect(preview.bytes).toBe(Buffer.byteLength(preview.html, 'utf8'))
    expect(preview.bytes).toBeGreaterThan(0)
  })

  it('omits the subject for templates that do not call defineEmail', async () => {
    const welcome = await $fetch<{ subject?: string }>(
      '/sub/__email/render?name=welcome&format=json',
    )

    expect(welcome).not.toHaveProperty('subject')
  })

  it('returns actionable development errors and rejects fixtureless templates', async () => {
    const broken = await testFetch('/sub/__email/render?name=broken&format=json')
    const brokenBody = await broken.json() as {
      data: {
        error: {
          name: string
          message: string
          stack: string
          componentName: string
          cause: { name: string, message: string, stack: string }
        }
      }
    }
    const fixtureless = await testFetch('/sub/__email/render?name=without-fixture&format=json')

    expect(broken.status).toBe(500)
    expect(brokenBody.data.error.componentName).toBe('broken')
    expect(brokenBody.data.error.name).toBe('EmailRenderError')
    expect(brokenBody.data.error.stack).toContain('EmailRenderError')
    expect(brokenBody.data.error.cause.message).toContain('Preview fixture failed: intentional test failure')
    expect(fixtureless.status).toBe(404)
  })

  it('reflects template edits without restarting the development server', async () => {
    const originalSource = await readFile(welcomeTemplate, 'utf8')
    const updatedSource = originalSource.replace('PREVIEW_VERSION_ONE', 'PREVIEW_VERSION_TWO')

    try {
      await writeFile(welcomeTemplate, updatedSource)
      await expect.poll(async () => {
        const result = await $fetch<{ html: string }>(
          '/sub/__email/render?name=welcome&format=json',
        )
        return result.html
      }, {
        interval: 100,
        timeout: 20_000,
      }).toContain('PREVIEW_VERSION_TWO')
    }
    finally {
      await writeFile(welcomeTemplate, originalSource)
    }
    // Rebuild latency under a fully parallel suite exceeds the 5s default budget,
    // and the poll window must fit inside the test's own timeout.
  }, 30_000)

  it('refreshes edited fixture data without restarting the development server', async () => {
    const originalSource = await readFile(welcomeFixture, 'utf8')
    const updatedSource = originalSource.replace('firstName: \'Ada\'', 'firstName: \'Grace\'')

    try {
      await writeFile(welcomeFixture, updatedSource)
      await expect.poll(async () => {
        const result = await $fetch<{ html: string }>(
          '/sub/__email/render?name=welcome&format=json',
        )
        return result.html
      }, {
        interval: 100,
        timeout: 20_000,
      }).toContain('Welcome, Grace')
    }
    finally {
      await writeFile(welcomeFixture, originalSource)
    }
  }, 30_000)

  it('regenerates the registry for real add, rename, and delete events', async () => {
    const emailDirectory = join(fixtureRoot, 'app/emails')
    const addedTemplate = join(emailDirectory, 'dynamic.vue')
    const addedFixture = join(emailDirectory, 'dynamic.fixtures.ts')
    const renamedTemplate = join(emailDirectory, 'renamed-dynamic.vue')
    const renamedFixture = join(emailDirectory, 'renamed-dynamic.fixtures.ts')
    const templateSource = '<template><EHtml><EBody><EText>DYNAMIC_REGISTRY_TEMPLATE</EText></EBody></EHtml></template>'
    const fixtureSource = 'export default {}\n'
    const templateNames = async () => {
      const result = await $fetch<{ templates: Array<{ name: string }> }>(
        '/sub/__email/api/templates',
      )
      return result.templates.map(template => template.name)
    }

    try {
      await writeFile(addedFixture, fixtureSource)
      await writeFile(addedTemplate, templateSource)
      await expect.poll(templateNames, { interval: 100, timeout: 20_000 })
        .toContain('dynamic')
      await expect.poll(async () => {
        const result = await $fetch<{ html: string }>(
          '/sub/__email/render?name=dynamic&format=json',
        )
        return result.html
      }, { interval: 100, timeout: 20_000 }).toContain('DYNAMIC_REGISTRY_TEMPLATE')

      await rename(addedFixture, renamedFixture)
      await rename(addedTemplate, renamedTemplate)
      await expect.poll(templateNames, { interval: 100, timeout: 20_000 })
        .toContain('renamed-dynamic')
      await expect.poll(templateNames, { interval: 100, timeout: 20_000 })
        .not.toContain('dynamic')

      await rm(renamedTemplate)
      await rm(renamedFixture)
      await expect.poll(templateNames, { interval: 100, timeout: 20_000 })
        .not.toContain('renamed-dynamic')
    }
    finally {
      await rm(addedTemplate, { force: true })
      await rm(addedFixture, { force: true })
      await rm(renamedTemplate, { force: true })
      await rm(renamedFixture, { force: true })
    }
  }, 60_000)
})
