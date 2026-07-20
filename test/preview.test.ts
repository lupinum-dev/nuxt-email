import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $fetch, createTest, fetch as testFetch, setupMaps } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const sourceFixtureRoot = fileURLToPath(new URL('./fixtures/preview', import.meta.url))
const fixtureRoot = await mkdtemp(join(dirname(sourceFixtureRoot), '.preview-test-'))
await cp(sourceFixtureRoot, fixtureRoot, {
  recursive: true,
  filter: source => !['.nuxt', '.output', 'node_modules'].includes(basename(source)),
})
const welcomeTemplate = join(fixtureRoot, 'app/emails/welcome.vue')

describe('development email preview', async () => {
  const test = createTest({
    dev: true,
    rootDir: fixtureRoot,
  })
  test.ctx.teardown = [() => rm(fixtureRoot, { recursive: true, force: true })]
  await setupMaps.vitest(test)

  it('serves the standalone sandboxed preview application', async () => {
    const response = await testFetch('/__email')
    const html = await response.text()

    expect(html).toContain('NUXT_EMAIL_PREVIEW_PAGE_V01')
    expect(html).toContain('role="tabpanel" aria-labelledby="tab-preview" sandbox')
    // New surface controls ship with accessible labelling.
    expect(html).toContain('role="group" aria-label="Preview viewport width"')
    expect(html).toContain('aria-label="Simulate a dark email client"')
    expect(html).toContain('id="subject"')
    expect(html).toContain('id="size-badge"')
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(response.headers.get('content-security-policy')).toContain('frame-src \'self\'')
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('lists every canonical template and its fixture availability', async () => {
    const result = await $fetch<{
      templates: Array<{ name: string, hasFixture: boolean }>
    }>('/__email/api/templates')

    expect(result.templates).toEqual([
      { name: 'broken', hasFixture: true },
      { name: 'welcome', hasFixture: true },
      { name: 'without-fixture', hasFixture: false },
    ])
  })

  it('matches canonical direct rendering in JSON and raw HTML views', async () => {
    const preview = await $fetch<{ name: string, html: string, text: string, bytes: number }>(
      '/__email/render?name=welcome&format=json',
    )
    const direct = await $fetch<{ html: string, text: string }>('/api/direct-render')
    const raw = await testFetch('/__email/render?name=welcome')
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
      '/__email/render?name=welcome&format=json',
    )

    expect(preview.bytes).toBe(Buffer.byteLength(preview.html, 'utf8'))
    expect(preview.bytes).toBeGreaterThan(0)
  })

  it('omits the subject for templates that do not call defineEmail', async () => {
    const welcome = await $fetch<{ subject?: string }>(
      '/__email/render?name=welcome&format=json',
    )

    expect(welcome).not.toHaveProperty('subject')
  })

  it('injects a dark-scheme simulation into the raw preview only when requested', async () => {
    const light = await testFetch('/__email/render?name=welcome')
    const lightHtml = await light.text()
    const dark = await testFetch('/__email/render?name=welcome&scheme=dark')
    const darkHtml = await dark.text()
    const invalid = await testFetch('/__email/render?name=welcome&scheme=sepia')

    expect(lightHtml).not.toContain('data-nuxt-email-dark-simulation')
    expect(darkHtml).toContain('<style data-nuxt-email-dark-simulation>:root{color-scheme:dark}</style></head>')
    // Simulation is additive: the rendered document is otherwise unchanged.
    expect(darkHtml.replace('<style data-nuxt-email-dark-simulation>:root{color-scheme:dark}</style>', '')).toBe(lightHtml)
    expect(invalid.status).toBe(400)
  })

  it('returns actionable development errors and rejects fixtureless templates', async () => {
    const broken = await testFetch('/__email/render?name=broken&format=json')
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
    const fixtureless = await testFetch('/__email/render?name=without-fixture&format=json')

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
          '/__email/render?name=welcome&format=json',
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
})
