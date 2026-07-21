import { describe, expect, it } from 'vitest'
import {
  PREVIEW_PAGE_CSP,
  PREVIEW_PAGE_HTML,
} from '../../src/runtime/server/preview-page.get'

describe('development preview page', () => {
  it('ships as one self-contained accessible product surface', () => {
    expect(PREVIEW_PAGE_HTML).toContain('NUXT_EMAIL_PREVIEW_PAGE_V01')
    expect(PREVIEW_PAGE_HTML).toContain('role="tablist"')
    expect(PREVIEW_PAGE_HTML).toContain('role="status" aria-live="polite"')
    expect(PREVIEW_PAGE_HTML).toContain('role="alert"')
    expect(PREVIEW_PAGE_HTML).toContain('role="tabpanel" aria-labelledby="tab-preview" sandbox')
    expect(PREVIEW_PAGE_HTML).toContain('target="_blank"')
    expect(PREVIEW_PAGE_HTML).toContain('rel="noopener noreferrer"')
    expect(PREVIEW_PAGE_HTML).toContain('@media (prefers-reduced-motion: reduce)')
    expect(PREVIEW_PAGE_HTML).not.toContain('<link ')
  })

  it('writes untrusted output as text and keeps rendered email scripts sandboxed', () => {
    expect(PREVIEW_PAGE_HTML).toContain('elements.html.textContent = output.html')
    expect(PREVIEW_PAGE_HTML).toContain('elements.text.textContent = output.text')
    expect(PREVIEW_PAGE_HTML).toContain('option.textContent =')
    expect(PREVIEW_PAGE_HTML).not.toContain('.innerHTML')
    expect(PREVIEW_PAGE_HTML).not.toContain('allow-scripts')
    expect(PREVIEW_PAGE_CSP).toContain('default-src \'none\'')
    expect(PREVIEW_PAGE_CSP).toContain('frame-src \'self\'')
    expect(PREVIEW_PAGE_CSP).toContain('frame-ancestors \'none\'')
    expect(PREVIEW_PAGE_CSP).toContain('object-src \'none\'')
    expect(PREVIEW_PAGE_HTML).toContain('state.html && !state.failed')
  })

  it('supports automatic refresh, exact copying, and fixture-preserving selection', () => {
    expect(PREVIEW_PAGE_HTML).toContain('document.visibilityState === \'visible\'')
    expect(PREVIEW_PAGE_HTML).toContain('navigator.clipboard.writeText(value)')
    expect(PREVIEW_PAGE_HTML).toContain('document.execCommand(\'copy\')')
    expect(PREVIEW_PAGE_HTML).toContain('previousStillExists')
    expect(PREVIEW_PAGE_HTML).toContain('new URLSearchParams({ name: name, format: \'json\' })')
    expect(PREVIEW_PAGE_HTML).toContain('return \'/__email/render?\' + query.toString()')
  })

  it('restores the preview iframe after a failed render recovers', () => {
    expect(PREVIEW_PAGE_HTML).toContain(`
          var recoveredFromError = state.failed
          clearError()
          if (outputChanged) {
            updatePreviewFrame()
          }
          showView(state.activeView)`)
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
