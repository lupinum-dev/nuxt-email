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
  <a href="https://discord.lupinum.com"><img src="https://img.shields.io/badge/Discord-18181B?logo=discord" alt="Discord"></a>
  <a href="https://deepwiki.com/lupinum-dev/nuxt-email"><img src="https://deepwiki.com/badge.svg" alt="Ask DeepWiki"></a>
</p>

> [!WARNING]
> The 1.0.0 beta is published on npm's [`next` tag](https://www.npmjs.com/package/@lupinum/nuxt-email?activeTab=versions). The [three-client beta smoke test](https://github.com/lupinum-dev/nuxt-email/blob/main/docs/release/client-qa-checklist.md#100-beta1-smoke-test) passed against beta.1; the full eight-client checklist and an external transactional beta still block stable `1.0.0`. The unscoped `nuxt-email` package on npm is unrelated to this project.

## Why use Nuxt Email?

Nuxt Email turns `app/emails/` into one typed template registry. You author normal Vue single-file components. Nitro renders deterministic HTML, plain text, and a subject line.

The module uses the same compiler and rendering core for production, development preview, and tests. Your application keeps control of delivery, recipients, and provider credentials.

## When to use it

Use Nuxt Email for account messages, receipts, alerts, and other transactional email that belongs to a Nuxt application.

Do not use it for marketing campaigns or a workflow shared by non-Nuxt applications. Use a dedicated email framework such as Maizzle for those cases. Nuxt Email does not send messages or manage recipients.

## Requirements

- Node.js `^22.22.3 || ^24.15.0 || ^26.0.0`.
- Nuxt `>=4.5.1 <5`.
- Vue `^3.5.40`.

CI tests every supported Node major. Release consumers verify the declared minimum and current Nuxt 4 and Vue 3 versions without a dependency shim.

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
defineProps<{ name: string, actionUrl: string }>()
</script>

<template>
  <EEmail :subject="`Welcome, ${name}`" lang="en" preview="Your account is ready." class="bg-slate-100 p-6">
    <EContainer class="rounded-lg bg-white p-8">
      <EHeading class="text-2xl font-semibold text-slate-900">Welcome, {{ name }}</EHeading>
      <EText class="text-slate-600">Your account is ready.</EText>
      <EButton :href="actionUrl" class="rounded-md bg-emerald-600 px-5 py-3 text-white">Open dashboard</EButton>
    </EContainer>
  </EEmail>
</template>
```

`EEmail` is the root of every template. It sets the subject, the language, and the preview text. Its `class` and `style` apply to the email body.

Render the template from Nitro:

```ts
export default defineEventHandler(async () => {
  return await renderEmail('welcome', {
    name: 'Ada',
    actionUrl: 'https://example.com/dashboard',
  })
})
```

The result has `html`, `text`, and `subject`. The template name and props are generated from the Vue file. Invalid names and props fail during type checking. Use a sibling fixture to inspect the template in `/__email`, then [pass the rendered result to your provider](https://nuxt-email.lupinum.com/docs/guides/sending-email).

Questions? Ask in the [Lupinum OSS Discord](https://discord.lupinum.com).

## Agent setup

`@lupinum/nuxt-email` ships its documentation inside the package for coding
agents such as Claude Code, Codex and Cursor. The pages match the installed
version, so an agent does not follow the website for a different version.

To set it up, give your coding agent this task:

```text
Set up @lupinum/nuxt-email for coding agents as described under "Agent setup" in its README.
```

### Steps for the agent

1. Find `node_modules/@lupinum/nuxt-email/dist/agent/AGENTS.md`. Look in the
   directory of the project that depends on `@lupinum/nuxt-email` first, then
   in its parent directories up to the repository root (workspaces can hoist
   packages). Read it; it lists the documentation pages.
2. Add the section below to the project's agent instructions: `AGENTS.md`, or
   `CLAUDE.md` if the project has only that file. If it has neither, create
   `AGENTS.md`. Write the path relative to the repository root, through
   `node_modules/@lupinum/nuxt-email` (for example
   `apps/web/node_modules/@lupinum/nuxt-email/...` in a workspace). Never write
   a resolved path such as `node_modules/.pnpm/...`: it contains the version and
   breaks after an upgrade. If a section for `@lupinum/nuxt-email` already
   exists, leave it as it is.

   Use the path you found in place of the sample path:

   ```md
   ## @lupinum/nuxt-email

   Before you change code that uses @lupinum/nuxt-email, read
   `node_modules/@lupinum/nuxt-email/dist/agent/AGENTS.md` and the pages it
   lists. They document the installed version. Prefer them over what you
   remember about this package and over the website.
   ```

3. Do not copy the documentation into the project and do not install a skill.
   The section points into the installed package, so it stays correct after
   every upgrade or downgrade.

If the file does not exist, the installed version has no packaged
documentation. Read the package README and its TypeScript types instead.

## Email components

Nuxt Email has 14 components for the email root, table layout, text, images, links, Outlook-safe buttons, Markdown, inline code, and fonts. `ECodeBlock` adds syntax highlighting. It is opt-in: install the Shiki packages (`pnpm add @shikijs/core @shikijs/engine-javascript @shikijs/langs @shikijs/themes`) and configure it:

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

## Tailwind CSS

Put Tailwind v4 classes on any element or component in a template. The build reads the classes from every file a template imports, outside `node_modules`, and converts them to inline styles with sizes in `px`. Media-query and pseudo-class rules go into the `<style>` element of the email. A production render loads neither Tailwind nor a CSS parser.

Add `app/emails/tailwind.css` for `@theme` and `@utility` blocks. Write every class completely in the template source: the build cannot resolve a class name that is built at run time. For such names, list the possible classes in that file with `@source inline("…")`.

## Development preview

Run the Nuxt application and open `/__email`. The development-only page shows the rendered message, HTML, plain text, subject, viewport sizes, and exact byte count. It also lists classes that the build kept as written because Tailwind does not know them.

Add one sibling fixture file for deterministic sample props. Preview routes and fixtures are excluded from production builds.

```ts
import type { EmailComponentProps } from '@lupinum/nuxt-email'
import type WelcomeEmail from './welcome.vue'

export default {
  name: 'Ada',
  actionUrl: 'https://example.com/dashboard',
} satisfies EmailComponentProps<typeof WelcomeEmail>
```

## Testing

Render your templates in a test without starting Nuxt:

```ts
import { createTestRenderer } from '@lupinum/nuxt-email/testing'

const { renderEmail } = await createTestRenderer({ rootDir: process.cwd() })
const email = await renderEmail('welcome', {
  name: 'Ada',
  actionUrl: 'https://example.com/dashboard',
})
```

`createTestRenderer` compiles the email directory with the same compiler as the module. Its `renderEmail` fails when a render keeps a class that has no effect, such as a wrong class name. Pass the module's `codeBlock` option when a template uses `ECodeBlock`.

## Compatibility evidence

Nuxt Email does not claim universal email-client compatibility. The Tailwind-to-inline-style conversion is adapted from React Email, and golden files in the repository pin the rendered output.

Complete the [manual client QA checklist](https://github.com/lupinum-dev/nuxt-email/blob/main/docs/release/client-qa-checklist.md) before a rendering release. Unit tests cannot prove how every email client displays a message.

## Package exports

The package has a module entry point plus build, production rendering, testing, error, and agent documentation subpaths. Use `@lupinum/nuxt-email/build` to compile a server registry for a Node backend outside Nuxt. The generated registry imports `@lupinum/nuxt-email/render` at run time. The [standalone guide](https://nuxt-email.lupinum.com/docs/guides/standalone-rendering) explains the build and runtime boundaries. The [canonical entry-point table](https://nuxt-email.lupinum.com/docs/reference/module#package-entry-points) lists every runtime and type-only export.

## Documentation

Read the [Nuxt Email documentation](https://nuxt-email.lupinum.com/docs). Start with the [installation guide](https://nuxt-email.lupinum.com/docs/getting-started/installation) and [component reference](https://nuxt-email.lupinum.com/docs/components). Use the guides for [preview](https://nuxt-email.lupinum.com/docs/guides/preview-workflow), [testing](https://nuxt-email.lupinum.com/docs/guides/testing-your-emails), and [sending](https://nuxt-email.lupinum.com/docs/guides/sending-email).

See the [changelog](CHANGELOG.md) for released changes.

## Contributing and development

Read the [contribution guide](https://github.com/lupinum-dev/nuxt-email/blob/main/.github/CONTRIBUTING.md) before you open a pull request. Run the normal handoff gate before you submit a change:

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm verify
```

Maintainers use the protected workflow in [Lupinum OSS](https://oss.lupinum.com/docs/releasing) for releases.

## Support and security

Open a [GitHub issue](https://github.com/lupinum-dev/nuxt-email/issues) for bugs and focused proposals. Join the [Lupinum OSS Discord](https://discord.lupinum.com) for project discussion.

Use the [private security process](https://github.com/lupinum-dev/nuxt-email/security/policy) to report a vulnerability. Do not report a vulnerability in a public issue.

## License

Nuxt Email is available under the [MIT License](LICENSE). Copyright belongs to [Lupinum OG](https://lupinum.com).
