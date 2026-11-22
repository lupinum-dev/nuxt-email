import { Script } from 'node:vm'
import { describe, expect, it } from 'vitest'
import { PREVIEW_PAGE_HTML } from '../../../src/runtime/dev-preview/page.get'
import { PREVIEW_PAGE_CLIENT } from '../../../src/runtime/dev-preview/page-script'

describe('development preview page', () => {
  it('ships syntactically valid client JavaScript', () => {
    expect(() => new Script(PREVIEW_PAGE_CLIENT)).not.toThrow()
  })

  // Rendered email HTML is untrusted: the page writes it as text and never lets it run scripts.
  it('never parses rendered output as HTML and keeps the preview frame script-free', () => {
    expect(PREVIEW_PAGE_HTML).not.toContain('.innerHTML')
    expect(PREVIEW_PAGE_HTML).not.toContain('allow-scripts')
  })

  it('keeps every client-script element lookup synchronized with the page markup', () => {
    const referencedIds = [...PREVIEW_PAGE_HTML.matchAll(/getElementById\('([^']+)'\)/g)]
      .map(match => match[1])

    expect(referencedIds.length).toBeGreaterThan(0)
    expect(new Set(referencedIds).size).toBe(referencedIds.length)
    for (const id of referencedIds) {
      expect(PREVIEW_PAGE_HTML, `missing #${id}`).toContain(`id="${id}"`)
    }
  })
})
