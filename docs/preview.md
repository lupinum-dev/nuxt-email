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

Render failures include the template name, the wrapped `EmailRenderError` stack, and its original cause. A template without a fixture remains visible in the list but cannot be rendered until its sibling fixture is added.

## Security and production boundary

The preview page, list endpoint, render endpoint, and fixture imports are registered only in development. Production builds contain none of their routes or fixture data. The raw render endpoint has a restrictive content security policy, and the page iframe is sandboxed without script permission so rendered template scripts cannot execute in the preview application origin.

The development endpoints are deliberately not configurable production render or send APIs. Use the typed server-only `renderEmail(name, props)` API in Nitro handlers and pass its result to the provider SDK owned by the application.
