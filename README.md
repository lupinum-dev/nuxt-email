<p align="center">
  <img src="docs/public/favicon.svg" width="128" alt="Nuxt Email icon">
</p>

<h1 align="center">Nuxt Email</h1>

<p align="center">Write typed transactional email as Vue components and render it directly in Nuxt.</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@lupinum/nuxt-email"><img src="https://img.shields.io/npm/v/@lupinum/nuxt-email?label=npm" alt="npm version"></a>
  <a href="https://github.com/lupinum-dev/nuxt-email/actions/workflows/ci.yml"><img src="https://github.com/lupinum-dev/nuxt-email/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT license"></a>
</p>

> [!WARNING]
> The first scoped release is in preparation. Public APIs can change before version 1.0. The unscoped `nuxt-email` package on npm is unrelated to this project.

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
pnpm add @lupinum/nuxt-email
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

const props = defineProps<{ firstName: string; activationUrl: string }>()

defineEmail({ subject: () => `Welcome, ${props.firstName}` })
</script>

<template>
  <ETailwind>
    <EHtml lang="en">
      <EBody class="bg-slate-100 p-6">
        <EPreview>Your account is ready.</EPreview>
        <EContainer class="bg-white p-6">
          <EHeading>Welcome, {{ firstName }}</EHeading>
          <EButton :href="activationUrl">Activate account</EButton>
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

The template name and props are generated from the Vue file. Invalid names and props fail during type checking.

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

- `@lupinum/nuxt-email` provides the Nuxt module and the `RenderedEmail` type.
- `@lupinum/nuxt-email/define-email` provides typed template metadata.
- `@lupinum/nuxt-email/testing` provides standalone component rendering.
- `@lupinum/nuxt-email/errors` provides supported runtime error classes.

## Documentation

Read the [Nuxt Email documentation](https://nuxt-email.lupinum.com/docs). It contains the [installation guide](https://nuxt-email.lupinum.com/docs/getting-started/installation), [component reference](https://nuxt-email.lupinum.com/docs/components), [testing guide](https://nuxt-email.lupinum.com/docs/guides/testing-your-emails), and [preview guide](https://nuxt-email.lupinum.com/docs/guides/preview-workflow).

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
