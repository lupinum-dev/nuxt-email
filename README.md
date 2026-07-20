# Nuxt Email

Nuxt Email is a Nuxt module for authoring transactional emails as ordinary Vue SFCs and rendering deterministic HTML and plain text from Nitro server code. Its email-safe primitives are tested against a pinned React Email behavioral oracle, while discovery, typing, preview, and rendering follow Vue and Nuxt conventions.

## Release status

`0.1.0` is the current release-candidate version, not an approved public release. `nuxt-email` is the working package name; npm name ownership and publishing access still need confirmation. Until that is resolved, install the exact verified release-candidate tarball supplied by the maintainer rather than assuming the npm name is available.

Final publication is also blocked on freezing the candidate commit and tarball checksum, the recorded manual checks in Gmail web, Apple Mail, and Outlook for Windows, and evidence from an external transactional-email beta. See the [v0.1 release-candidate record](https://github.com/Mat4m0/nuxt-email/blob/main/docs/release/v0.1-release-candidate.md) for the live gate status.

## Supported environment

- Node.js `^22.12.0 || ^24.11.0` — Node 22 from 22.12 onward, or Node 24 from 24.11 onward.
- Nuxt `^4.4.8` — Nuxt 4.4.8 or a later Nuxt 4 release.
- Vue `^3.5.0`.

The automated release matrix runs the lockfile's Nuxt `4.4.8` on Node `22.12.0` and the current Node `24.x` runner. Later Nuxt 4 releases are accepted by the peer range but are not separate CI anchors while `4.4.8` is current.

Node 20, Node 23, Node 25, Nuxt 3, Nuxt 5, edge runtimes, and client-side email rendering are outside the v0.1 support contract.

## Install and configure

In an existing supported Nuxt application, install the verified local tarball:

```bash
pnpm add /absolute/path/to/nuxt-email-0.1.0-rc.tgz
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
defineProps<{
  activationUrl: string
  firstName: string
}>()
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

The fourteen `E*` components are auto-registered for email rendering; templates do not import them. Use normal `defineProps()`, slots, `v-if`, `v-for`, HTML attributes, and Vue style bindings. The [component reference](./docs/components.md) records every component's important props, fixed semantics, and defaults.

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
}
```

Do not import `renderEmail` into Vue components or other client code. Nuxt Email does not send mail, choose providers, manage recipients, or own subjects. Pass the returned `html` and `text` to the provider SDK in your application, alongside that provider's own `from`, `to`, and `subject` fields. See the [renderer and error contract](./docs/renderer.md).

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

Run `pnpm exec nuxt dev` and open `/__email`. The page provides the sandboxed email preview, exact HTML, plain text, copy/open actions, render errors, and automatic refresh. Through Nuxt Email's canonical discovery path, fixtures, preview handlers, and preview UI are excluded from production builds; do not import fixtures into production application code. Read the [preview guide](./docs/preview.md) for the exact security and fixture contract.

## Compatibility and limits

Nuxt Email does not claim full React Email compatibility. The generated [conformance report](./docs/conformance/report.md) is the source of truth for supported behavior, intentional Vue/email-safety divergences, and unsupported React Email components. The oracle is pinned to React Email `6.9.0`, `@react-email/render` `2.1.0`, and source commit `6eb428924c4c2774228a07cbec1977ad8898f143`; provenance is recorded separately in the [license policy](./docs/conformance/provenance.md).

The v0.1 surface intentionally excludes Tailwind, Markdown, font loading, code components, provider adapters, send endpoints, template metadata, raw-HTML primitives, configuration options, and a public registry API.

## Documentation

- [Getting started](./docs/getting-started.md)
- [Component reference](./docs/components.md)
- [Renderer, plain-text, error, and security contracts](./docs/renderer.md)
- [Runtime dependency and license review](./docs/runtime-dependencies.md)
- [Development preview](./docs/preview.md)
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

`pnpm dev` starts the local playground. `pnpm release:verify` builds and inspects the package, then materializes, installs, prepares, type-checks, builds, and server-renders the fixed fresh application twice in isolation. The development-preview interaction is covered separately by `pnpm test`; the automated fresh-install timing does not claim to measure a person's reading or typing time. Publication remains blocked until the external gates in the release-candidate record are complete.
