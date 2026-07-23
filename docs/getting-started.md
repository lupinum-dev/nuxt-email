# Getting started from a fresh Nuxt application

This path mirrors the automated fresh-install fixture: it installs `@lupinum/nuxt-email`, registers the module, creates one typed Vue email and sibling preview fixture, renders it from Nitro, type-checks the generated API, and builds production output.

The release verifier starts its timer before materializing these fixed application files and stops after installation, prepare, type checks, production build, and deterministic server render. The development-preview routes and interactions are exercised by the separate module end-to-end suite. These automated measurements prove the tool path; they do not claim to measure a person's reading or typing speed.

## 1. Check the prerequisites

Use one of the supported Node ranges:

- Node `22.18.0` through the latest Node 22 release.
- Node `24.11.0` through the latest Node 24 release.
- Node `26.0.0` through the latest Node 26 release.

The supported Nuxt range starts at `4.4.8`, which is the verified compatibility baseline. The release gate also exercises the current Nuxt 4 release candidate. As of 2026-07-21, Nuxt `4.5.0` fails its own isolated Vite production build before Nuxt Email loads because `@nuxt/vite-builder` imports an undeclared `unplugin` dependency, so v1 remains gated on an upstream patch. The verified toolchain uses Vue `3.5.40`, TypeScript `5.9.3`, and the repository-pinned pnpm `11.13.1`.

The declared Nuxt peer range is `^4.4.8`. The unscoped `nuxt-email` package on npm is unrelated to this project; always use the scoped package name.

## 2. Create the application manifest

Create an empty directory and add this `package.json`:

```json
{
  "name": "nuxt-email-getting-started",
  "private": true,
  "type": "module",
  "dependencies": {
    "@lupinum/nuxt-email": "^1.0.0",
    "nuxt": "^4.4.8",
    "typescript": "5.9.3",
    "vue": "3.5.40",
    "vue-tsc": "3.3.7"
  }
}
```

For pnpm, add the same native-build approvals used by the fresh-install fixture:

```yaml
# pnpm-workspace.yaml
allowBuilds:
  '@parcel/watcher': true
  esbuild: true
  unrs-resolver: true
```

Install the dependencies:

```bash
pnpm install
```

## 3. Register Nuxt Email

```ts
// nuxt.config.ts
import type { NuxtConfig } from 'nuxt/schema'
import NuxtEmail from '@lupinum/nuxt-email'

export default {
  modules: [NuxtEmail],
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
} satisfies NuxtConfig
```

Add the ordinary Nuxt TypeScript entry point:

```json
// tsconfig.json
{
  "extends": "./.nuxt/tsconfig.json"
}
```

Add a minimal application page:

```vue
<!-- app/app.vue -->
<template>
  <main>Nuxt Email getting-started application</main>
</template>
```

## 4. Create a typed email template

Create `app/emails/welcome.vue`:

```vue
<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'

defineOptions({ name: 'WelcomeEmail' })

const props = defineProps<{
  orderNumber: number
  recipientName: string
}>()

defineEmail({
  subject: () => `Order ${props.orderNumber} confirmed`,
})
</script>

<template>
  <ETailwind>
    <EHtml lang="en">
      <EHead>
        <title>Order confirmation</title>
      </EHead>
      <EBody class="m-0 bg-slate-100 p-6">
        <EPreview>Your order is ready.</EPreview>
        <EContainer class="rounded-lg bg-white p-6">
          <EHeading class="m-0 text-2xl text-slate-900">
            Order {{ orderNumber }} for {{ recipientName }}
          </EHeading>
          <EText class="text-slate-600">We have received your order.</EText>
          <EButton
            class="rounded-md bg-blue-600 px-5 py-3 text-white"
            :href="`https://example.com/orders/${orderNumber}`"
          >
            View order
          </EButton>
        </EContainer>
      </EBody>
    </EHtml>
  </ETailwind>
</template>
```

No component imports are needed. The module auto-imports exactly eighteen email primitives into email templates. Tailwind v4 is opt-in per template through `ETailwind`; emails without that boundary are not rewritten by the Tailwind engine.

## 5. Add the development fixture

Create the exact sibling `app/emails/welcome.fixtures.ts`:

```ts
import type WelcomeEmail from './welcome.vue'

type WelcomeEmailProps = Omit<
  InstanceType<typeof WelcomeEmail>['$props'],
  keyof import('vue').PublicProps
>

export default {
  orderNumber: 2048,
  recipientName: 'Fixture Ada',
} satisfies WelcomeEmailProps
```

The file must default-export one object. Only the exact `.fixtures.ts` suffix is recognized. The `satisfies` expression makes fixture values obey the same SFC prop type used by the generated server API.

## 6. Render from a Nitro handler

Create `server/api/email.get.ts`:

```ts
export default defineEventHandler(() => {
  return renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada & Lin',
  })
})
```

`renderEmail` is a generated Nitro auto-import. Do not import it from `@lupinum/nuxt-email` or `#imports`, and do not call it from client code. TypeScript checks both the name `welcome` and its exact props. It returns `{ html, text, subject? }`; `subject` is present because this template called `defineEmail`.

## 7. Generate types and verify them

```bash
pnpm exec nuxt prepare
pnpm exec vue-tsc --noEmit -p .nuxt/tsconfig.server.json
pnpm exec vue-tsc --noEmit -p .nuxt/tsconfig.node.json
```

The generated server declarations change when templates are added, renamed, or deleted. If an editor was open before `nuxt prepare`, restart its TypeScript service once so it reads `.nuxt/tsconfig.server.json`.

## 8. Preview and render

Start Nuxt:

```bash
pnpm exec nuxt dev
```

Open these local routes:

- `/__email` — choose `welcome`, then inspect Preview, HTML, and Plain text.
- `/api/email` — receive the production API contract with rendered `html`, `text`, and optional `subject` from the Nitro handler.

Saving `welcome.vue` or its sibling fixture refreshes the preview without a full server restart. Stop the development server before the production check.

## 9. Build the production application

```bash
pnpm exec nuxt build
```

Through Nuxt Email's canonical generated API, the production server contains the discovered template and renderer because the Nitro handler needs them, while the client bundle does not. The `/__email` application, its endpoints, and discovered `.fixtures.ts` modules are absent from production output. Do not explicitly import email templates into client code or fixture modules into production application code.

## What to do next

- Read the [component reference](./components.md) before translating a larger design.
- Read the [renderer contract](./renderer.md) before connecting a provider SDK.
- Use the [React Email migration guide](./migration-from-react-email.md) for an existing JSX template.
- Inspect the [Tailwind contract](./components.md#tailwind) before translating application utility classes directly into email markup.
