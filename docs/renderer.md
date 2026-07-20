# Renderer contract

`renderEmail(name, props)` is the single public rendering path. Nuxt generates its template names and prop types from `app/emails/`, then resolves the selected Vue SFC through the same server-only registry used by development preview.

```ts
const result = await renderEmail('welcome', {
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

The API is auto-imported only in Nitro server files. Rendering failures are wrapped in `EmailRenderError`. Its `componentName` is the registry template name and its `cause` preserves the original error and stack. An unknown runtime name throws `UnknownEmailTemplateError` with the requested name and the sorted known names.

## Plain text

Plain text is produced directly from the rendered HTML with the pinned `html-to-text` behavior used by the React Email oracle. Images, head content, scripts, styles, and elements marked `data-skip-in-text="true"` are excluded. Preview filler therefore never enters the fallback.

Ordinary table cells follow the oracle's existing flattening behavior. Add `data-text-format="dataTable"` to a table only when aligned row output is explicitly wanted. Nested lists, ordered-list starts, blockquotes, hard breaks, preformatted content, fragment links, and `mailto:` links have exact conformance cases.

## Determinism and measurement

The renderer creates a fresh Vue SSR application for every call. It does not cache output, add IDs or timestamps, mutate global renderer state, fetch assets, or expose timing and size fields in `RenderedEmail`. Test-only instrumentation records UTF-8 byte sizes, cold and warm timing, repeated-render identity, and sequential heap behavior in [the Phase 3 measurement](./performance/phase-3.md).
