import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { $fetch, fetch as testFetch, setup } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

const fixtureRoot = fileURLToPath(new URL('./fixtures/preview', import.meta.url))
const welcomeTemplate = fileURLToPath(new URL(
  './fixtures/preview/app/emails/welcome.vue',
  import.meta.url,
))

describe('development email preview', async () => {
  await setup({
    dev: true,
    rootDir: fixtureRoot,
  })

  it('serves the standalone sandboxed preview application', async () => {
    const response = await testFetch('/__email')
    const html = await response.text()

    expect(html).toContain('NUXT_EMAIL_PREVIEW_PAGE_V01')
    expect(html).toContain('role="tabpanel" aria-labelledby="tab-preview" sandbox')
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
    const preview = await $fetch<{ name: string, html: string, text: string }>(
      '/__email/render?name=welcome&format=json',
    )
    const direct = await $fetch<{ html: string, text: string }>('/api/direct-render')
    const raw = await testFetch('/__email/render?name=welcome')
    const rawHtml = await raw.text()

    expect(preview).toEqual({ name: 'welcome', ...direct })
    expect(rawHtml).toBe(preview.html)
    expect(raw.headers.get('cache-control')).toBe('no-store')
    expect(raw.headers.get('content-type')).toContain('text/html')
    expect(raw.headers.get('content-security-policy')).toContain('script-src \'none\'')
    expect(raw.headers.get('content-security-policy')).toContain('object-src \'none\'')
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
        timeout: 10_000,
      }).toContain('PREVIEW_VERSION_TWO')
    }
    finally {
      await writeFile(welcomeTemplate, originalSource)
    }
  })
})
