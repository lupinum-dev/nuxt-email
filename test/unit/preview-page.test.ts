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
    expect(PREVIEW_PAGE_HTML).toContain('window.setInterval(function () { void refresh(false) }, 1000)')
    expect(PREVIEW_PAGE_HTML).toContain('navigator.clipboard.writeText(value)')
    expect(PREVIEW_PAGE_HTML).toContain('previousStillExists')
    expect(PREVIEW_PAGE_HTML).toContain('new URLSearchParams({ name: name, format: \'json\' })')
    expect(PREVIEW_PAGE_HTML).toContain('return \'/__email/render?\' + query.toString()')
  })
})
