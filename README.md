# Nuxt Email

Nuxt Email is a Nuxt module for authoring transactional emails as ordinary Vue SFCs and rendering deterministic HTML and plain text from Nitro server code. Its email-safe primitives are tested against a pinned React Email behavioral oracle, while discovery, typing, preview, and rendering follow Vue and Nuxt conventions.

## Release status

`0.1.0` is the current release-candidate version, not an approved public release.

The unscoped npm name `nuxt-email` is **already owned by an unrelated package** (`nuxt-email@1.2.2`, a Nodemailer-based module by a different author), so this project cannot publish under it. The scoped name `@lupinum/nuxt-email` is currently unregistered and is the likely publish name, but the final name, ownership, and access are a maintainer decision and remain a release blocker. Until that is resolved, use only the exact candidate tarball and SHA-256 named in the release record rather than assuming any npm name.

Final publication is also blocked on the recorded manual checks in Gmail web, Apple Mail, and Outlook for Windows, and evidence from an external transactional-email beta. See the [v0.1 release-candidate record](https://github.com/Mat4m0/nuxt-email/blob/main/docs/release/v0.1-release-candidate.md) for the live gate status.

## Supported environment

- Node.js `^22.12.0 || ^24.11.0` — Node 22 from 22.12 onward, or Node 24 from 24.11 onward.
- Nuxt `^4.4.8` — Nuxt 4.4.8 or a later Nuxt 4 release.
- Vue `^3.5.0`.

The CI matrix runs lint, type checks, and the full test suite on Linux, macOS, and Windows across Node `22.12.0` and the current Node `24.x`. The runtime-heavy oracle, conformance-report, and package/fresh-install verifications run once on the Linux Node `22.12.0` runner. Node 20, Node 23, Node 25, Nuxt 3, Nuxt 5, edge runtimes, and client-side email rendering are outside the v0.1 support contract.

## Install and configure

In an existing supported Nuxt application, install the candidate tarball identified in the release record:

```bash
pnpm add /absolute/path/to/nuxt-email-0.1.0.tgz
```

Register the module:

```ts
// nuxt.config.ts
import NuxtEmail from 'nuxt-email'

export default defineNuxtConfig({
  modules: [NuxtEmail],
})
```

There are no v0.1 module options. Follow the [complete fresh-install guide](./docs/getting-started.md) for the release-tested setup.

## Author a Vue email

Every `.vue` file under `app/emails/` is a template. Nested paths become slash-separated names; for example, `app/emails/account/reset-password.vue` is named `account/reset-password`. `app/emails/components/` is reserved for application-owned supporting components and is not discovered as templates.

```vue
<!-- app/emails/welcome.vue -->
<script setup lang="ts">
const props = defineProps<{
  activationUrl: string
  firstName: string
}>()

// Optional: declare the subject line from the same typed props.
defineEmail<typeof props>({
  subject: p => `Welcome, ${p.firstName}`,
})
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>Activate your account</title>
    </EHead>
    <EBody>
      <EPreview>Your account is ready.</EPreview>
      <EContainer>
        <EHeading>Welcome, {{ firstName }}</EHeading>
        <EText>Finish setting up your account.</EText>
        <EButton :href="activationUrl" :style="{ padding: '12px 20px' }">
          Activate account
        </EButton>
      </EContainer>
    </EBody>
  </EHtml>
</template>
```

The nineteen `E*` components are auto-registered for email rendering; templates do not import them:

- **Document and layout** — `EHtml`, `EHead`, `EBody`, `EContainer`, `ESection`, `ERow`, `EColumn`, `EHr`.
- **Content** — `EHeading`, `EText`, `ELink`, `EImg`, the Outlook-safe `EButton`, and the hidden `EPreview` preheader.
- **Typography and code** — `EFont` (`@font-face` loading), `ECodeInline`, and `ECodeBlock` (Prism syntax highlighting).
- **Authoring helpers** — `EMarkdown` (Markdown to email-safe HTML) and `ETailwind` (render-time Tailwind class inlining, including utilities emitted inside nested components, with non-inlinable rules downleveled into a `<head>` `<style>`).

Use normal `defineProps()`, slots, `v-if`, `v-for`, HTML attributes, and Vue style bindings. `defineEmail({ subject })` is an optional server-side auto-import that computes a subject line from the template's typed props. The [component reference](./docs/components.md) records every component's important props, fixed semantics, and defaults.

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

The result is exactly:

```ts
interface RenderedEmail {
  html: string
  text: string
  /** Present only when the template declared a subject with `defineEmail`. */
  subject?: string
}
```

Do not import `renderEmail` into Vue components or other client code. Nuxt Email does not send mail, choose providers, or manage recipients. It can declare a `subject` (via `defineEmail`), but the application still owns delivery: pass the returned `html`, `text`, and optional `subject` to the provider SDK alongside that provider's own `from` and `to` fields. See the [renderer and error contract](./docs/renderer.md).

## Test your emails

Render any email component to `{ html, text, subject? }` in a unit test without booting Nuxt, using the `nuxt-email/testing` subpath:

```ts
import { normalizeEmailHtml, renderEmailComponent } from 'nuxt-email/testing'
import Welcome from './app/emails/welcome.vue'

const { html, text } = await renderEmailComponent(Welcome, {
  activationUrl: 'https://example.com/activate',
  firstName: 'Ada',
})
```

`normalizeEmailHtml` is the exact normalizer the project uses for its own React Email conformance suite, so structurally equivalent documents compare equal despite insignificant serialization differences. See the [testing guide](./docs/testing.md).

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
- a **dark**-client simulation, and
- a **Gmail clipping budget** badge showing the exact UTF-8 byte size, amber past 80 KiB and red past Gmail's 100 KiB clip limit.

Through Nuxt Email's canonical discovery path, fixtures, preview handlers, and preview UI are excluded from production builds; do not import fixtures into production application code. Read the [preview guide](./docs/preview.md) for the exact security and fixture contract.

## Email-client proofs

The [proof kit](https://github.com/Mat4m0/nuxt-email/blob/main/scripts/README-proofs.md) renders a representative batch of emails to `.html`, `.txt`, and valid `.eml` (`multipart/alternative`, quoted-printable, CRLF) messages that open directly in a desktop client, with an optional Resend send path:

```bash
pnpm proofs:generate   # write release-artifacts/proofs/
pnpm proofs:send       # optional: POST the batch to Resend (no key ⇒ prints instructions)
```

Delivering that batch and completing the [client QA checklist](https://github.com/Mat4m0/nuxt-email/blob/main/docs/release/client-qa-checklist.md) in real clients is a release gate.

## Compatibility and limits

Nuxt Email does not claim full React Email compatibility. The generated [conformance report](./docs/conformance/report.md) is the source of truth for supported behavior, intentional Vue/email-safety divergences, and unsupported components. It currently records **61 of 61 runnable behaviors passing**: 10 exact, 40 normalized, 5 semantic, and 6 intentional divergences, against React Email `6.9.0`, `@react-email/render` `2.1.0`, and source commit `6eb428924c4c2774228a07cbec1977ad8898f143`; provenance is recorded separately in the [license policy](./docs/conformance/provenance.md).

The v0.1 surface intentionally excludes provider adapters, send endpoints, raw-HTML primitives, configuration options, and a public registry API. Sending and subject/recipient delivery remain application-owned.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Component reference](./docs/components.md)
- [Renderer, plain-text, error, and security contracts](./docs/renderer.md)
- [Testing utilities (`nuxt-email/testing`)](./docs/testing.md)
- [Runtime dependency and license review](./docs/runtime-dependencies.md)
- [Development preview](./docs/preview.md)
- [Email-client proof kit](https://github.com/Mat4m0/nuxt-email/blob/main/scripts/README-proofs.md)
- [React Email migration](./docs/migration-from-react-email.md)
- [Generated conformance report](./docs/conformance/report.md)
- [Manual email-client QA](./docs/testing/manual-email-client-qa.md)
- [External beta record](./docs/testing/external-beta.md)
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

`pnpm dev` starts the local playground. `pnpm release:verify` builds and inspects the package, then materializes, installs, prepares, type-checks, builds, and server-renders the fixed fresh application twice in isolation. It refuses to run on a dirty worktree, so commit first. Publication remains blocked until the external gates in the release-candidate record are complete.
