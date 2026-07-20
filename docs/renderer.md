# Renderer contract

`renderEmailComponent(component, props)` is the single component renderer used by the Nuxt registry, server API, and development preview. During core development it is available from the server-only `nuxt-email/core` entry point.

```ts
import { renderEmailComponent } from 'nuxt-email/core'
import WelcomeEmail from './WelcomeEmail.vue'

const result = await renderEmailComponent(WelcomeEmail, {
  firstName: 'Ada',
})
```

The promise resolves to exactly two values:

```ts
interface RenderedEmail {
  html: string
  text: string
}
```

## Template requirements

- A template must render exactly one `<html>` root containing exactly one `<body>`.
- `<head>` is optional, though `EHead` supplies the recommended email metadata.
- Wrap complete templates in `EHtml` and `EBody`; the renderer does not repair or auto-wrap fragments, text roots, or body-only templates.
- Runtime props declared with Vue's ordinary `defineProps()` or component `props` option are checked before SSR. Missing required props and unknown props fail deterministically.
- Interpolation and attribute values use Vue SSR escaping. The v0.1 primitive set has no raw-HTML component and rejects content-replacement and event-handler attributes.

Failures are wrapped in `EmailRenderError`. Its `componentName` identifies the template and its `cause` preserves the original error and stack.

## Plain text

Plain text is produced directly from the rendered HTML with the pinned `html-to-text` behavior used by the React Email oracle. Images, head content, scripts, styles, and elements marked `data-skip-in-text="true"` are excluded. Preview filler therefore never enters the fallback.

Ordinary table cells follow the oracle's existing flattening behavior. Add `data-text-format="dataTable"` to a table only when aligned row output is explicitly wanted. Nested lists, ordered-list starts, blockquotes, hard breaks, preformatted content, fragment links, and `mailto:` links have exact conformance cases.

## Determinism and measurement

The renderer creates a fresh Vue SSR application for every call. It does not cache output, add IDs or timestamps, mutate global renderer state, fetch assets, or expose timing and size fields in `RenderedEmail`. Test-only instrumentation records UTF-8 byte sizes, cold and warm timing, repeated-render identity, and sequential heap behavior in [the Phase 3 measurement](./performance/phase-3.md).
