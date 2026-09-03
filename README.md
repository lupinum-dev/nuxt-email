<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/icon-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/public/icon-light.svg">
    <img src="docs/public/icon-light.svg" width="128" alt="Nuxt Email icon">
  </picture>
</p>

<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/public/wordmark-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="docs/public/wordmark-light.svg">
    <img src="docs/public/wordmark-light.svg" width="256" alt="Nuxt Email">
  </picture>
</h1>

<p align="center">Write typed transactional email as Vue components and render it directly in Nuxt.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@lupinum/nuxt-email"><img src="https://img.shields.io/npm/v/@lupinum/nuxt-email?color=00DC82" alt="npm version"></a>
  <a href="https://github.com/lupinum-dev/nuxt-email/actions/workflows/ci.yml"><img src="https://github.com/lupinum-dev/nuxt-email/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-00DC82" alt="MIT license"></a>
  <a href="https://discord.gg/RPH6SeA36N"><img src="https://img.shields.io/badge/Discord-18181B?logo=discord" alt="Discord"></a>
  <a href="https://deepwiki.com/lupinum-dev/nuxt-email"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

> [!WARNING]
> [`1.0.0-beta.2`](https://www.npmjs.com/package/@lupinum/nuxt-email/v/1.0.0-beta.2) is published on npm's `next` tag. The [three-client beta smoke test](https://github.com/lupinum-dev/nuxt-email/blob/main/docs/release/client-qa-checklist.md#100-beta1-smoke-test) passed against beta.1; the full eight-client checklist and an external transactional beta still block stable `1.0.0`. The unscoped `nuxt-email` package on npm is unrelated to this project.

## Why use Nuxt Email?

Nuxt Email turns `app/emails/` into one typed template registry. You author normal Vue single-file components. Nitro renders deterministic HTML, plain text, and an optional subject line.

The module uses the same rendering core for production, development preview, and tests. Your application keeps control of delivery, recipients, and provider credentials.

## When to use it

Use Nuxt Email for account messages, receipts, alerts, and other transactional email that belongs to a Nuxt application.

Do not use it for marketing campaigns or a workflow shared by non-Nuxt applications. Use a dedicated email framework such as Maizzle for those cases. Nuxt Email does not send messages or manage recipients.

## Requirements

- Node.js `^22.18.0 || ^24.11.0 || ^26.0.0`.
- Nuxt `>=4.5.1 <5`.
- Vue `^3.5.35`.

CI tests every supported Node major. The release consumer installs Nuxt `4.5.2` without a dependency shim.

## Installation

Install and register the module:

```bash
pnpm add @lupinum/nuxt-email@next
```

```ts
export default defineNuxtConfig({
  modules: ['@lupinum/nuxt-email'],
})
```

## Quick start

Create `app/emails/welcome.vue`:

```vue
<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'

const props = defineProps<{
  firstName: string
  activationUrl: string
}>()

defineEmail({
  subject: () => `Welcome aboard, ${props.firstName}`,
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
          <EHeading class="m-0 text-2xl text-slate-900">Welcome, {{ firstName }}</EHeading>
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

Render the template from Nitro:

```ts
export default defineEventHandler(async () => {
  return await renderEmail('welcome', {
    firstName: 'Ada',
    activationUrl: 'https://example.com/activate',
  })
})
```

The template name and props are generated from the Vue file. Invalid names and props fail during type checking. Use a sibling fixture to inspect it in `/__email`, then [pass the rendered result to your provider](https://nuxt-email.lupinum.com/docs/guides/sending-email).

## Discord

Join the Lupinum OSS community to discuss Nuxt Email, ask questions, and share
what you build.

<p align="center">
  <a href="https://discord.gg/RPH6SeA36N">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="docs/public/discord-dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="docs/public/discord-light.svg">
      <img src="docs/public/discord-light.svg" width="500" alt="Join the Lupinum OSS Discord">
    </picture>
  </a>
</p>

## Email components

Nuxt Email registers 18 server components for document structure, table layout, text, images, links, Outlook-safe buttons, Markdown, inline code, fonts, previews, and Tailwind.

`ETailwind` converts compatible Tailwind v4 utilities to inline styles. It keeps media-query and pseudo-class rules in the document head. Configure `ECodeBlock` only when you need syntax highlighting:

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

## Development preview

Run the Nuxt application and open `/__email`. The development-only page shows the rendered message, HTML, plain text, subject, viewport sizes, and exact byte count.

Add one sibling fixture file for deterministic sample props. Preview routes and fixtures are excluded from production builds.

```ts
import type { EmailComponentProps } from '@lupinum/nuxt-email'
import type WelcomeEmail from './welcome.vue'

export default {
  firstName: 'Ada',
  activationUrl: 'https://example.com/activate',
} satisfies EmailComponentProps<typeof WelcomeEmail>
```

## Testing

Render a Vue email without starting Nuxt:

```ts
import { renderEmailComponent } from '@lupinum/nuxt-email/testing'
import Welcome from './app/emails/welcome.vue'

const result = await renderEmailComponent(Welcome, {
  firstName: 'Ada',
  activationUrl: 'https://example.com/activate',
})
```

Use `#nuxt-email/testing` after `nuxt prepare` when the template uses configured components such as `ECodeBlock`.

## Compatibility evidence

Nuxt Email does not claim universal email-client or React Email compatibility. The generated [conformance report](https://github.com/lupinum-dev/nuxt-email/blob/main/docs/conformance/report.md) records each compared behavior and each intentional difference.

Complete the [manual client QA checklist](https://github.com/lupinum-dev/nuxt-email/blob/main/docs/release/client-qa-checklist.md) before a rendering release. Unit tests cannot prove how every email client displays a message.

## Package exports

The package has a module entry point plus focused build, production rendering, metadata, testing, and error subpaths. Use `@lupinum/nuxt-email/build` to compile a server registry and `@lupinum/nuxt-email/render` for compiled components outside Nitro. The [standalone guide](https://nuxt-email.lupinum.com/docs/guides/standalone-rendering) explains the build and runtime boundaries. The [canonical entry-point table](https://nuxt-email.lupinum.com/docs/reference/module#package-entry-points) lists every runtime and type-only export.

## Documentation

Read the [Nuxt Email documentation](https://nuxt-email.lupinum.com/docs). Start with the [installation guide](https://nuxt-email.lupinum.com/docs/getting-started/installation) and [component reference](https://nuxt-email.lupinum.com/docs/components). Use the guides for [preview](https://nuxt-email.lupinum.com/docs/guides/preview-workflow), [testing](https://nuxt-email.lupinum.com/docs/guides/testing-your-emails), and [sending](https://nuxt-email.lupinum.com/docs/guides/sending-email).

See the [changelog](CHANGELOG.md) for released changes.

## Contributing and development

Read the [contribution guide](https://github.com/lupinum-dev/nuxt-email/blob/main/CONTRIBUTING.md) before you open a pull request. Run the normal handoff gate before you submit a change:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

Maintainers use the protected workflow in [MAINTAINING.md](https://github.com/lupinum-dev/nuxt-email/blob/main/MAINTAINING.md) for releases.

## Support and security

Open a [GitHub issue](https://github.com/lupinum-dev/nuxt-email/issues) for bugs and focused proposals. Join the [Lupinum OSS Discord](https://discord.gg/RPH6SeA36N) for project discussion.

Use the [private security process](https://github.com/lupinum-dev/nuxt-email/security/policy) to report a vulnerability. Do not report a vulnerability in a public issue.

## License

Nuxt Email is available under the [MIT License](LICENSE). Copyright belongs to [Lupinum OG](https://lupinum.com).
