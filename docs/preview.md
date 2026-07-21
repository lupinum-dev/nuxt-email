# Development preview

Nuxt Email exposes `/__email` while the Nuxt development server is running. The page lists every template discovered under `app/emails/`, marks templates without fixture data, and shows the selected template as rendered HTML, exact HTML source, or plain text. While the page is visible it polls the development endpoints once per second, so saved template and fixture changes appear without restarting Nuxt; polling pauses in a hidden tab.

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

Only `.fixtures.ts` is recognized. The preview intentionally supports one fixed scenario per template and does not accept request-provided props or generate editing forms.

## Inspect output

- **Preview** loads the raw rendered HTML in a sandboxed iframe.
- **HTML** displays the exact `html` returned by `renderEmail()`.
- **Plain text** displays the exact `text` returned by `renderEmail()`.
- **Copy** copies the active exact representation.
- **Open** opens the raw development render in a separate tab.

The representation tabs are reachable with `1`/`2`/`3`, or with the arrow keys inside the tab list.

Render failures include the template name, the wrapped `EmailRenderError` stack, and its original cause. A template without a fixture remains visible in the list but cannot be rendered until its sibling fixture is added.

## Subject

When a template declares its subject with `defineEmail`, the computed subject line is shown above the preview. Import `defineEmail` from its stable server-only subpath and capture the template's real props in the subject closure:

```vue
<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'

const props = defineProps<{ productName: string, version: string }>()

defineEmail({
  subject: () => `${props.productName} ${props.version} — what's new`,
})
</script>
```

The subject surfaces on the render result as `subject`. Templates that do not call `defineEmail` show a subtle "No subject defined" hint instead.

## Preview controls

- **Viewport width** renders the preview iframe at **600px** (the email standard), **375px** (mobile), or **Full** available width.

The preview deliberately has no dark-mode simulation. Email clients apply dark-mode transformations differently, so a browser toggle would create false confidence. Verify dark-mode behavior in the real clients you support.

## Gmail clipping budget

The badge above the preview shows the exact UTF-8 byte size of the rendered HTML. Its warning bands use the commonly observed Gmail clipping area (warning at 81,920 bytes, high risk above 102,400 bytes) as an **approximate authoring budget**, not a guarantee of Gmail behavior for every account, message, or delivery path. The `bytes` field on the JSON render response is exact; the client-specific interpretation is not.

## Endpoints

All routes are registered with `env: 'dev'` and never emitted in a production build.

| Route | Query | Returns |
| --- | --- | --- |
| `GET /__email` | — | The standalone preview page. |
| `GET /__email/api/templates` | — | `{ templates: [{ name, hasFixture }] }`. |
| `GET /__email/render` | `name`, `format=html\|json` | Raw HTML (default) or `{ name, html, text, subject?, bytes }`. |

`format=json` includes `bytes` (the exact UTF-8 length of `html`) and `subject` when the template declared one. An invalid `format` returns `400`.

## Security and production boundary

The preview page, list endpoint, render endpoint, and fixture imports are registered only in development. Production builds contain none of their routes or fixture data. The raw render endpoint has a restrictive content security policy, and the page iframe is sandboxed without script permission so rendered template scripts cannot execute in the preview application origin.

The development endpoints are deliberately not configurable production render or send APIs. Use the typed server-only `renderEmail(name, props)` API in Nitro handlers and pass its result to the provider SDK owned by the application.
