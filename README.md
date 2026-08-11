# Nuxt Email

Typed transactional email for Nuxt, with email-safe Tailwind v4.

Nuxt Email turns `app/emails/` into a typed, Nitro-native email renderer. Author ordinary Vue SFCs, style them with Tailwind v4 or Vue styles, preview the exact server output, and call `renderEmail('welcome', props)` from Nitro. The module owns rendering; your application keeps control of delivery.

## Why Nuxt Email

- **Nuxt-native and typed.** Template names and props are generated from the SFCs in your application. There is no sidecar build or second template registry.
- **Tailwind v4 built for email output.** `ETailwind` inlines compatible utilities, keeps author styles authoritative, and moves media-query and pseudo-class rules into the document head.
- **One rendering core.** Development preview, testing helpers, and Nitro rendering use the same isolated Vue SSR renderer and an explicit component registry.
- **Email-safe primitives.** Eighteen built-in server components cover documents, table layout, content, Outlook-safe buttons, Markdown, inline code, fonts, previews, and Tailwind; `ECodeBlock` is added only when configured.
- **Behavior is verified, not hand-waved.** Covered primitives are compared case by case with a pinned React Email oracle. The generated conformance report records exact matches and intentional divergences; it does not claim universal email-client parity.

## Is it the right tool?

Choose Nuxt Email for **transactional email that belongs to a Nuxt application**: account messages, receipts, alerts, and other request- or job-time output that benefits from generated template/prop types and direct Nitro integration.

[Maizzle](https://maizzle.com/) is the stronger choice when you want a standalone email framework, static or marketing-email builds, a broader transformation pipeline, or a workflow shared across non-Nuxt applications. Nuxt Email is deliberately not trying to reproduce Maizzle's CLI, configuration system, or campaign-oriented build pipeline.

## Release status

The package identity is **`@lupinum/nuxt-email`**. The repository is still pre-1.0 while its automated release checks, real-client QA, and external transactional beta are completed. The unscoped `nuxt-email` package on npm is unrelated to this project.

## Supported environment

- Node.js `^22.18.0 || ^24.11.0 || ^26.0.0` — the supported even-numbered Node 22, 24, and 26 lines.
- Nuxt `>=4.4.8 <4.5.0`.
- Vue `^3.5.35`.

Nuxt `4.4.8` is the verified compatibility baseline. Nuxt `4.5.x` is explicitly excluded: an exact Nuxt `4.5.2` no-hoist consumer still fails before this module loads because `@nuxt/vite-builder` imports an undeclared `unplugin` dependency. Widen the peer range only after an isolated consumer passes without a dependency shim. CI covers Node 22, 24, and 26. Other Node majors, Nuxt 3, Nuxt 5, edge runtimes, and client-side email rendering are outside the support contract.

## Install and configure

In an existing supported Nuxt application:

```bash
npx nuxt module add @lupinum/nuxt-email
```

Or install and register it manually:

```bash
pnpm add @lupinum/nuxt-email
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@lupinum/nuxt-email'],
})
```

Syntax-highlighted code blocks are deliberately opt-in. Configure one Shiki theme and the closed set of languages your emails use:

```ts
export default defineNuxtConfig({
  modules: ['@lupinum/nuxt-email'],
  nuxtEmail: {
    codeBlock: {
      languages: ['typescript', 'vue'],
      theme: 'github-dark',
    },
  },
})
```

Without `codeBlock`, `ECodeBlock` is not registered and Shiki is not loaded or included in the production bundle. Shiki remains an installation-time dependency; this option removes its module-setup and deployed-bundle cost, not its package download. Follow the [installation guide](https://nuxt-email.lupinum.com/docs/getting-started/installation) for the supported setup.

## Author a Vue email

Every `.vue` file under `app/emails/` is a template. Nested paths become slash-separated names; for example, `app/emails/account/reset-password.vue` is named `account/reset-password`. `app/emails/components/` is reserved for application-owned supporting components and is not discovered as templates.

Discovery follows Nuxt's active `srcDir` (`src/emails/` when `srcDir: 'src/'`). It intentionally does not merge email templates from inherited layers; the active application owns one registry.

```vue
<!-- app/emails/welcome.vue -->
<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'

const props = defineProps<{
  activationUrl: string
  firstName: string
}>()

// Optional: declare the subject line from the same typed props.
defineEmail({
  subject: () => `Welcome, ${props.firstName}`,
})
</script>

<template>
  <ETailwind>
    <EHtml lang="en">
      <EHead>
        <title>Activate your account</title>
      </EHead>
      <EBody class="m-0 bg-slate-100 p-6">
        <EPreview>Your account is ready.</EPreview>
        <EContainer class="rounded-lg bg-white p-6">
          <EHeading class="m-0 text-2xl text-slate-900">
            Welcome, {{ firstName }}
          </EHeading>
          <EText class="text-slate-600">Finish setting up your account.</EText>
          <EButton class="rounded-md bg-blue-600 px-5 py-3 text-white" :href="activationUrl">
            Activate account
          </EButton>
        </EContainer>
      </EBody>
    </EHtml>
  </ETailwind>
</template>
```

The eighteen built-in `E*` components are auto-registered for email rendering; templates do not import them. Configuring `codeBlock` adds `ECodeBlock`:

- **Document and layout** — `EHtml`, `EHead`, `EBody`, `EContainer`, `ESection`, `ERow`, `EColumn`, `EHr`.
- **Content** — `EHeading`, `EText`, `ELink`, `EImg`, the Outlook-safe `EButton`, and the hidden `EPreview` preheader.
- **Typography and code** — `EFont` (`@font-face` loading), `ECodeInline`, and the opt-in `ECodeBlock`.
- **Authoring helpers** — `EMarkdown` (Markdown to email-safe HTML) and `ETailwind` (render-time Tailwind class inlining, including utilities emitted inside nested components, with non-inlinable rules downleveled into a `<head>` `<style>`).

Use normal `defineProps()`, slots, `v-if`, `v-for`, HTML attributes, Tailwind classes, and Vue style bindings. Import `defineEmail` from `@lupinum/nuxt-email/define-email` when the template owns its subject line; its zero-argument closure captures the template's actual props, so there is no separate metadata prop type to drift. The [component reference](https://nuxt-email.lupinum.com/docs/components) records every component's important props, fixed semantics, and defaults.

`ETailwind` does not automatically load the Nuxt app stylesheet or inherit browser CSS variables. To make utilities such as `text-primary` share application colors, pass a concrete Tailwind v4 `theme` string or `config` sourced from your application's canonical design-token module. Render-time filesystem CSS imports and CSS `@plugin` imports are intentionally not resolved; executable plugins belong in `config`.

## Render from Nitro

`renderEmail` is auto-imported only in Nitro server code. Its template name and props are generated from the same registry used at runtime.

```ts
// server/api/welcome.get.ts
export default defineEventHandler(async () => {
  return await renderEmail('welcome', {
    activationUrl: 'https://example.com/activate',
    firstName: 'Ada',
  })
})
```

The canonical result type is available as a type-only root import:

```ts
import type { RenderedEmail } from '@lupinum/nuxt-email'
```

It contains `html`, `text`, and an optional `subject` present only when the template declared one with `defineEmail`.

Do not import `renderEmail` into Vue components or other client code. Nuxt Email does not send mail, choose providers, or manage recipients. It can declare a `subject` (via `defineEmail`), but the application still owns delivery: pass the returned `html`, `text`, and optional `subject` to the provider SDK alongside that provider's own `from` and `to` fields. See the [renderer contract](https://nuxt-email.lupinum.com/docs/reference/render-email).

## Test your emails

Render templates that use the eighteen built-ins to `{ html, text, subject? }` without booting Nuxt, using the stable testing subpath:

```ts
import { renderEmailComponent } from '@lupinum/nuxt-email/testing'
import Welcome from './app/emails/welcome.vue'

const { html, text } = await renderEmailComponent(Welcome, {
  activationUrl: 'https://example.com/activate',
  firstName: 'Ada',
})
```

Vue SFC tests need `@vitejs/plugin-vue` in their Vitest config. The helper is Node/test-only and must not enter application or shared client code.

Templates that use configured components such as `ECodeBlock` must use the binding generated from the application's Nuxt configuration after `nuxt prepare`:

```ts
import { renderEmailComponent } from '#nuxt-email/testing'
```

Configure Vitest with `@vitejs/plugin-vue`, map `#nuxt-email/testing` from the path written to `.nuxt/tsconfig.json`, use the Node environment, and run `nuxt prepare` first. This uses Nuxt's generated alias without booting its SSR-disabled unit-test environment; email components are server-only. Both the generated helper and `renderEmail` use the same configured renderer. The generated alias is also Node-test-only. The standalone helper fails loudly if a template references an unregistered `E*` component in development or production.

Assert on recipient-visible content and required markup rather than normalizing the
entire document into a broad snapshot. See the [testing guide](https://nuxt-email.lupinum.com/docs/guides/testing-your-emails).

## Preview in development

Add one exact sibling fixture for deterministic sample props:

```ts
// app/emails/welcome.fixtures.ts
import type WelcomeEmail from './welcome.vue'

type WelcomeEmailProps = Omit<
  InstanceType<typeof WelcomeEmail>['$props'],
  keyof import('vue').PublicProps
>

export default {
  activationUrl: 'https://example.com/activate',
  firstName: 'Ada',
} satisfies WelcomeEmailProps
```

Run `pnpm exec nuxt dev` and open `/__email`. The page provides the sandboxed email preview, exact HTML, plain text, and copy/open actions, plus:

- the computed **subject** line (or a "No subject defined" hint),
- a **viewport** toggle — 600px, 375px, or full width,
- a **rendered-size** badge showing the exact UTF-8 byte count, with an approximate Gmail clipping-budget warning.

The byte count is exact; Gmail clipping behavior is not a cross-account or cross-client guarantee. The preview does not simulate dark mode. Test dark-mode behavior and final rendering in real target clients.

Through Nuxt Email's canonical discovery path, fixtures, preview handlers, and preview UI are excluded from production builds; do not import fixtures into production application code. Read the [preview guide](https://nuxt-email.lupinum.com/docs/guides/preview-workflow) for the exact security and fixture contract.

## Email-client proofs

The [proof kit](https://github.com/Mat4m0/nuxt-email/blob/main/scripts/proofs/README.md) renders a representative batch of emails to `.html`, `.txt`, and valid `.eml` (`multipart/alternative`, quoted-printable, CRLF) messages that open directly in a desktop client, with an optional Resend send path:

```bash
pnpm proofs:generate   # write release-artifacts/proofs/
pnpm proofs:send       # optional: POST the batch to Resend (no key ⇒ prints instructions)
```

Delivering that batch and completing the [client QA checklist](https://github.com/Mat4m0/nuxt-email/blob/main/docs/release/client-qa-checklist.md) in real clients is a release gate.

## Compatibility and limits

Nuxt Email does not claim full React Email compatibility. The generated [conformance report](https://github.com/Mat4m0/nuxt-email/blob/main/docs/conformance/report.md) is the source of truth for runnable reference cases, intentional divergences, and unsupported components; provenance is recorded separately in the [license policy](https://github.com/Mat4m0/nuxt-email/blob/main/docs/conformance/provenance.md).

The pre-1.0 surface intentionally excludes provider adapters, send endpoints, raw-HTML primitives, configurable discovery paths, and a public registry API. `codeBlock` is the only module option. Sending and subject/recipient delivery remain application-owned.

Stable package entry points are deliberately small:

- `@lupinum/nuxt-email` — the Nuxt module.
- `@lupinum/nuxt-email/define-email` — template metadata and its typed errors.
- `@lupinum/nuxt-email/testing` — standalone component rendering.
- `@lupinum/nuxt-email/errors` — supported runtime error classes.

## Documentation

The [documentation site](https://nuxt-email.lupinum.com/docs) is the canonical source for public guides and API contracts:

- [Getting started](https://nuxt-email.lupinum.com/docs/getting-started)
- [Component reference](https://nuxt-email.lupinum.com/docs/components)
- [Renderer, plain-text, error, and security contracts](https://nuxt-email.lupinum.com/docs/reference/render-email)
- [Testing utilities (`@lupinum/nuxt-email/testing`)](https://nuxt-email.lupinum.com/docs/guides/testing-your-emails)
- [Development preview](https://nuxt-email.lupinum.com/docs/guides/preview-workflow)
- [React Email migration](https://nuxt-email.lupinum.com/docs/reference/migration)

Repository-only engineering and release evidence remains on GitHub:

- [Runtime dependency and license review](https://github.com/Mat4m0/nuxt-email/blob/main/docs/runtime-dependencies.md)
- [Future feature roadmap](https://github.com/Mat4m0/nuxt-email/blob/main/docs/roadmap.md)
- [Generated conformance report](https://github.com/Mat4m0/nuxt-email/blob/main/docs/conformance/report.md)
- [Manual email-client QA](https://github.com/Mat4m0/nuxt-email/blob/main/docs/testing/manual-email-client-qa.md)
- [External beta record](https://github.com/Mat4m0/nuxt-email/blob/main/docs/testing/external-beta.md)
- [Email-client proof kit](https://github.com/Mat4m0/nuxt-email/blob/main/scripts/proofs/README.md)
- [Changelog](./CHANGELOG.md)

## Local development

Use the repository-pinned pnpm version:

```bash
pnpm install --frozen-lockfile
pnpm dev:prepare
pnpm lint
pnpm test:types
pnpm test
pnpm conformance:check
pnpm oracle:check
pnpm performance:measure
pnpm dev:build
pnpm release:verify
```

`pnpm dev` starts the local playground. `pnpm release:verify` builds and inspects the package, then materializes, installs, prepares, type-checks, builds, and server-renders a fresh application at the supported Nuxt baseline. Publication still requires that complete gate, the recorded real-client QA, and external beta sign-off.
