# Development preview

Nuxt Email exposes `/__email` while the Nuxt development server is running. The page lists every template discovered under `app/emails/`, marks templates without fixture data, and shows the selected template as rendered HTML, exact HTML source, or plain text. It polls the development endpoints once per second, so saved template and fixture changes appear without restarting Nuxt.

The preview calls the same server-only registry and `renderEmail()` implementation used by application handlers. It is a rendering and debugging tool, not a second rendering path or an email-client compatibility guarantee.

## Add deterministic fixture props

Place one exact sibling file beside a template:

```text
app/emails/welcome.vue
app/emails/welcome.fixtures.ts
```

The fixture default-exports one props object. Type it from the Vue component so missing, incorrect, and extra props fail during type checking:

```ts
import type WelcomeEmail from './welcome.vue'

type WelcomeEmailProps = Omit<
  InstanceType<typeof WelcomeEmail>['$props'],
  keyof import('vue').PublicProps
>

export default {
  firstName: 'Ada',
} satisfies WelcomeEmailProps
```

Only `.fixtures.ts` is recognized. v0.1 intentionally supports one fixed scenario per template and does not accept request-provided props or generate editing forms.

## Inspect output

- **Preview** loads the raw rendered HTML in a sandboxed iframe.
- **HTML** displays the exact `html` returned by `renderEmail()`.
- **Plain text** displays the exact `text` returned by `renderEmail()`.
- **Copy** copies the active exact representation.
- **Open** opens the raw development render in a separate tab.

The representation tabs are reachable with `1`/`2`/`3`, or with the arrow keys inside the tab list.

Render failures include the template name, the wrapped `EmailRenderError` stack, and its original cause. A template without a fixture remains visible in the list but cannot be rendered until its sibling fixture is added.

## Subject

When a template declares its subject with `defineEmail`, the computed subject line is shown above the preview. `defineEmail` is auto-imported by the module and receives the same typed props passed to `renderEmail()`:

```vue
<script setup lang="ts">
const props = defineProps<{ productName: string, version: string }>()

defineEmail<typeof props>({
  subject: p => `${p.productName} ${p.version} — what's new`,
})
</script>
```

The subject surfaces on the render result as `subject`. Templates that do not call `defineEmail` show a subtle "No subject defined" hint instead.

## Preview controls

- **Viewport width** renders the preview iframe at **600px** (the email standard), **375px** (mobile), or **Full** available width.
- **Dark** simulates a dark email client. It reloads the iframe with `?scheme=dark`, and the render endpoint injects `<style>:root{color-scheme:dark}</style>` into the email's `<head>`. This flips the iframe's user-agent canvas and default form-control colors, approximating how a dark client frames the message. It is a visual approximation, not a full dark render: it deliberately cannot re-trigger an email's own `@media (prefers-color-scheme: dark)` rules, which would require browser-level media emulation. The unmodified HTML is always what the byte budget, **Copy**, and **Open** report.

## Gmail clipping budget

The badge above the preview shows the exact UTF-8 byte size of the rendered HTML. Gmail clips messages larger than **102,400 bytes**; the badge turns amber from **81,920 bytes** and red once the limit is exceeded. The size is reported as `bytes` on the JSON render response and always reflects the true output, independent of the dark-mode simulation.

## Endpoints

All routes are registered with `env: 'dev'` and never emitted in a production build.

| Route | Query | Returns |
| --- | --- | --- |
| `GET /__email` | — | The standalone preview page. |
| `GET /__email/api/templates` | — | `{ templates: [{ name, hasFixture }] }`. |
| `GET /__email/render` | `name`, `format=html\|json`, `scheme=light\|dark` | Raw HTML (default) or `{ name, html, text, subject?, bytes }`. |

`format=json` includes `bytes` (the exact UTF-8 length of `html`) and `subject` when the template declared one. `scheme=dark` applies to the raw HTML view only. Invalid `format` or `scheme` values return `400`.

## Security and production boundary

The preview page, list endpoint, render endpoint, and fixture imports are registered only in development. Production builds contain none of their routes or fixture data. The raw render endpoint has a restrictive content security policy, and the page iframe is sandboxed without script permission so rendered template scripts cannot execute in the preview application origin.

The development endpoints are deliberately not configurable production render or send APIs. Use the typed server-only `renderEmail(name, props)` API in Nitro handlers and pass its result to the provider SDK owned by the application.
