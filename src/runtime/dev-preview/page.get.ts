import { defineEventHandler, setHeaders } from 'h3'
import { PREVIEW_PAGE_CSS } from './page.css'
import { PREVIEW_PAGE_CLIENT } from './page-script'

export const PREVIEW_PAGE_CSP: string = [
  'default-src \'none\'',
  'script-src \'unsafe-inline\'',
  'style-src \'unsafe-inline\'',
  'connect-src \'self\'',
  'frame-src \'self\'',
  'frame-ancestors \'none\'',
  'img-src data:',
  'base-uri \'none\'',
  'object-src \'none\'',
  'form-action \'none\'',
].join('; ')

export const PREVIEW_PAGE_HTML: string = `<!doctype html>
<html lang="en" data-nuxt-email-preview="NUXT_EMAIL_PREVIEW_PAGE_V01">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nuxt Email · Preview</title>
  <style>
${PREVIEW_PAGE_CSS}
  </style>
</head>
<body>
  <div class="shell">
    <header class="topbar">
      <div class="mark" aria-hidden="true">E</div>
      <div>
        <h1 class="product-name">Nuxt Email</h1>
        <p class="product-context">Canonical development preview</p>
      </div>
      <div id="status" class="status" data-state="loading" role="status" aria-live="polite">
        <span class="status-dot" aria-hidden="true"></span>
        <span id="status-text">Connecting…</span>
      </div>
    </header>

    <div class="workspace">
      <aside class="sidebar" aria-label="Preview controls">
        <div>
          <label class="field-label" for="template-select">Template</label>
          <select id="template-select" class="template-select" disabled></select>
          <p id="fixture-note" class="fixture-note">Looking for colocated fixtures…</p>
        </div>

        <div>
          <p class="section-label">Representation</p>
          <div id="tabs" class="tabs" role="tablist" aria-label="Email representation">
            <button id="tab-preview" class="tab" type="button" role="tab" aria-selected="true" aria-controls="panel-preview" data-view="preview">
              <span>Preview</span><span class="tab-key">1</span>
            </button>
            <button id="tab-html" class="tab" type="button" role="tab" aria-selected="false" aria-controls="panel-html" tabindex="-1" data-view="html">
              <span>HTML</span><span class="tab-key">2</span>
            </button>
            <button id="tab-text" class="tab" type="button" role="tab" aria-selected="false" aria-controls="panel-text" tabindex="-1" data-view="text">
              <span>Plain text</span><span class="tab-key">3</span>
            </button>
          </div>
        </div>

        <p class="sidebar-note">Fixtures stay in development. The preview refreshes automatically and uses the same server renderer as <code>renderEmail()</code>.</p>
      </aside>

      <main class="main">
        <div class="viewer-toolbar">
          <h2 id="viewer-title" class="viewer-title">No template selected</h2>
          <div id="preview-controls" class="preview-controls" data-active="true">
            <div class="viewport-toggle" role="group" aria-label="Preview viewport width">
              <button id="viewport-600" class="segment" type="button" data-width="600" aria-pressed="true" title="Standard email width">600</button>
              <button id="viewport-375" class="segment" type="button" data-width="375" aria-pressed="false" title="Mobile width">375</button>
              <button id="viewport-full" class="segment" type="button" data-width="full" aria-pressed="false" title="Full available width">Full</button>
            </div>
          </div>
          <div class="viewer-actions">
            <button id="copy-button" class="action" type="button" disabled>Copy HTML</button>
            <a id="open-link" class="action" aria-disabled="true" aria-label="Open rendered email in a new tab" rel="noopener noreferrer" target="_blank">Open</a>
          </div>
        </div>

        <div class="meta-bar">
          <p id="subject" class="subject" data-state="none" aria-live="polite">
            <span class="subject-label" aria-hidden="true">Subject</span>
            <span id="subject-value" class="subject-value">No template selected</span>
          </p>
          <p id="size-badge" class="size-badge" data-level="ok" role="status" aria-live="polite" title="Rendered HTML size. Gmail clips messages larger than 102 KB.">
            <span id="size-value" class="size-value">—</span>
          </p>
        </div>

        <section class="viewer" aria-label="Selected email output">
          <iframe id="panel-preview" class="panel" role="tabpanel" aria-labelledby="tab-preview" sandbox data-width="600" title="Email preview"></iframe>
          <pre id="panel-html" class="panel" role="tabpanel" aria-labelledby="tab-html" hidden></pre>
          <pre id="panel-text" class="panel" role="tabpanel" aria-labelledby="tab-text" hidden></pre>
          <div id="empty" class="empty">
            <p><strong>Waiting for a fixture</strong>Select a fixture-backed template to render its exact output.</p>
          </div>
          <pre id="error" class="error" role="alert" hidden></pre>
        </section>
      </main>
    </div>
  </div>

  <script>
${PREVIEW_PAGE_CLIENT}
  </script>
</body>
</html>`

export default defineEventHandler((event) => {
  setHeaders(event, {
    'cache-control': 'no-store',
    'content-security-policy': PREVIEW_PAGE_CSP,
    'content-type': 'text/html; charset=utf-8',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  })

  return PREVIEW_PAGE_HTML
})
