# Renderer, output, error, and security contracts

`renderEmail(name, props)` is the one public application rendering path. Nuxt generates its template names and prop types from `app/emails/`, then resolves the selected Vue SFC through the same canonical server-only registry used by development preview.

```ts
const result = await renderEmail('welcome', {
  firstName: 'Ada',
})
```

The function is a Nitro auto-import. It is available in server handlers and other Nitro server code, not in Vue components, plugins that run on the client, or production client bundles. Do not import it from `@lupinum/nuxt-email` or `#imports`.

## Success contract

The promise resolves to rendered HTML and plain text, plus an optional subject declared by the template:

```ts
interface RenderedEmail {
  html: string
  text: string
  subject?: string
}
```

`subject` is absent unless the template imports `defineEmail` from `@lupinum/nuxt-email/define-email` and declares a subject closure. There is no preview metadata, provider result, diagnostics object, timing, or size field. Sending is not part of this function. Application code supplies recipients, sender identity, credentials, and provider-specific options directly to its chosen provider SDK.

```vue
<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'

const props = defineProps<{ firstName: string }>()

defineEmail({
  subject: () => `Welcome, ${props.firstName}`,
})
</script>
```

## HTML contract

- `html` begins with the XHTML 1.0 Transitional doctype used by the conformance contract.
- A template must render exactly one `<html>` root containing exactly one `<body>`.
- `EHead` is optional but supplies the recommended UTF-8 and Apple reformatting meta tags.
- `EHtml` and `EBody` are the supported complete-document wrappers. The renderer does not repair or auto-wrap fragments, text roots, body-only templates, or multiple document roots.
- Vue SSR interpolation and attribute values are escaped.
- Rendering removes only Vue's empty/fragment bookkeeping comments observed by the conformance suite. Test normalization never changes production output.
- A fresh isolated Vue SSR application is created for every call, with exactly nineteen email components registered inside it.
- Framework code does not fetch images, stylesheets, fonts, or other remote assets during rendering.

Two calls with the same template code and props are required to return byte-identical HTML and text. Templates remain responsible for avoiding clocks, random values, mutable external state, and nondeterministic data.

## Props and generated types

Template names are relative `.vue` paths under `app/emails/`, without the extension and with `/` separators. For example, `app/emails/account/reset-password.vue` becomes `account/reset-password`. Files below `app/emails/components/` are excluded.

Props declared with ordinary `defineProps()` or Vue's component `props` option drive both the generated call-site type and runtime declaration. TypeScript rejects unknown template names, missing required props, incorrect values, and extra props. Runtime calls from untyped boundaries reject unknown props and declared required props deterministically before SSR; application-specific value validation still belongs at the boundary that receives the data.

There is no public registry API. The generated registry is an internal server artifact and the sole source for rendering, generated types, and development preview listings.

## Plain-text contract

`text` is produced from the final rendered HTML with pinned `html-to-text` behavior and no line wrapping. Head content, images, script/style content, and elements marked `data-skip-in-text="true"` are excluded. `EPreview` is therefore absent from the fallback.

Links retain destinations when the visible text differs. Fragment links and `mailto:` links follow the recorded oracle behavior. Nested lists, ordered-list starts, blockquotes, hard breaks, preformatted content, Unicode, and ordinary tables have exact conformance cases. Add `data-text-format="dataTable"` to a table only when aligned row output is explicitly required.

Plain text is a deterministic fallback, not a second author-maintained template. Inspect it in `/__email` for every transactional template.

## Error contract

Errors are intentionally small and actionable:

| Error | When it occurs | Stable information |
| --- | --- | --- |
| `UnknownEmailTemplateError` | An untyped runtime name is not in the generated registry. | `requestedName`, sorted `knownNames`, and a message containing both. |
| `EmailRenderError` | Component loading, prop validation, Vue SSR, document validation, or plain-text conversion fails. | `componentName` set to the registry template name and the original failure preserved as `cause`. |
| `DuplicateEmailTemplateError` | Two discovered paths normalize to one template name. | `templateName`, sorted `sourcePaths`. |
| `EmailTemplateDiscoveryError` | Template discovery cannot inspect a source path. | `sourcePath` and the underlying `cause`. |
| `DefineEmailOutsideRenderError` | `defineEmail()` is called outside an active email render. | Stable error name and message. |
| `DuplicateEmailDefinitionError` | One render calls `defineEmail()` more than once. | Stable error name and message. |
| `TailwindMissingHeadError` | Non-inlinable Tailwind rules have no `<head>` inside their `ETailwind` boundary. | Message names the offending classes. |

Original stack information is preserved through `cause`. Application HTTP handlers decide how much error information to expose; Nuxt Email does not serialize filesystem paths or stacks into a production response. Development preview returns richer local error detail for authoring.

Import the public render, metadata, lookup, and Tailwind errors from `@lupinum/nuxt-email/errors`. Template discovery errors are module-setup diagnostics and are not part of that public runtime subpath.

## Security boundary

Nuxt Email renders trusted application templates with untrusted values supplied only through normal escaped Vue bindings. It is not an HTML sanitizer.

- All E-prefixed primitives reject `innerHTML`, `textContent`, and attributes beginning with `on`.
- There is no raw-HTML component. Do not use `v-html` or native raw HTML with untrusted content inside an application template.
- `href` and `src` values are escaped but URL schemes are not validated. Validate application-controlled URLs before rendering.
- When consumed through the canonical generated API, template modules and the renderer are server-only and excluded from the application client build. Application code must not import email templates into client code.
- When consumed through Nuxt Email's discovery and preview paths, development fixture modules, preview UI, and preview endpoints are absent from production builds. Application code must not import fixture modules into production code.
- No production HTTP render route and no send route are generated. A route exists only when the application author creates one.
- The development raw preview response uses a restrictive content security policy, while the preview application embeds it in a sandboxed iframe without script permission.

The production server intentionally contains templates referenced by its canonical registry. The security guarantee is client exclusion, not removal from the server that renders them.

## Determinism and measurement

The renderer does not cache output, add IDs or timestamps, mutate a shared renderer instance, or expose performance data in `RenderedEmail`. Test-only instrumentation records UTF-8 byte sizes, cold and warm timing, repeated-render identity, and sequential heap behavior in [the Phase 3 measurement](./performance/phase-3.md).

See the generated [conformance report](./conformance/report.md) for exact, normalized, semantic, intentional-divergence, and unsupported cases.
