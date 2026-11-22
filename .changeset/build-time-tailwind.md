---
"@lupinum/nuxt-email": major
---

Change email templates to one `EEmail` root with Tailwind classes resolved at build time, so a production render no longer loads Tailwind or a CSS parser.

A template's root is `<EEmail :subject="…" lang="en">`. Tailwind classes work on every element and component without a wrapper. A responsive padding class such as `sm:p-8` on `ESection`, `ERow` or `EContainer` changes the padding of the inner cell at that breakpoint. A template has a `<template>` block and optional `<script>` blocks in JavaScript or TypeScript; style blocks, custom blocks and `src=` blocks fail the build. `renderEmail()` always returns a `subject` string.

The Nuxt module, `@lupinum/nuxt-email/build` and the new `createTestRenderer()` use the same compiler and render the same HTML. The build reads classes from every file a template imports; files in `node_modules` are not read. In the Nuxt module and `createTestRenderer()`, a shared component outside the email directory gets its styles too, and `createTestRenderer()` resolves Nuxt's default `~`, `@`, `~~` and `@@` aliases. `@lupinum/nuxt-email/build` compiles a self-contained email directory: it fails with a clear error on an import from outside that directory or a Nuxt alias. The build inlines the styles of the classes it finds; responsive and pseudo-class rules go into the email's `<style>`. It converts that CSS with the new `lightningcss` dependency, so inline styles write colors as hex or `rgba()` and drop leading zeros, with the same rendered result. Sizes from Tailwind classes are written in `px` (16 px per `rem`), because Outlook on Windows does not support `rem`. `unplugin-vue` is no longer a dependency.

Fix the module registering the email components as Nuxt server components, which switched on Nuxt's `/__nuxt_island/**` route in production for every app that installs the module. Editors and `vue-tsc` still know the tags through a generated type declaration.

A `codeBlock.languages` entry listed twice, for example by a Nuxt layer and the app, is now used once instead of failing setup. `CodeBlockOptions` is exported as a type from the module entry and from `@lupinum/nuxt-email/testing`.

Fix the Nuxt DevTools tab of the email preview, which stayed empty because the preview page refused to be framed.

Tailwind declarations merge in stylesheet order whatever the order in `class`, and author `style` declarations come last, so an author `padding` beats a Tailwind `padding-left`.

Logical utilities such as `ps-4`, `text-start` and `rounded-s-lg` produce left-to-right physical properties; a right-to-left email uses physical utilities.

An exclusive upper breakpoint such as `max-sm:` ends at 0.02px below the breakpoint, so it no longer overlaps the next one.

A utility that only sets a custom property for another class, such as `ring-blue-500`, has no effect on its own and stays in `class`.

`ELink` and `EButton` reject an `href` with a `javascript:`, `vbscript:` or `data:` scheme, and `EImg` rejects a `src` with a `javascript:` or `vbscript:` scheme.

Migration: replace `EHtml`, `EHead`, `EBody` and `EPreview` with one `EEmail` root. Use its `lang`, `dir` and `preview` props, put `<head>` content in `<template #head>`, and move body `class` and `style` to `EEmail`.

Migration: replace `defineEmail({ subject, text })` with the `subject` and `text` props of `EEmail`. Remove imports of `@lupinum/nuxt-email/define-email`.

Migration: replace `ETailwind` with nothing. Put Tailwind classes directly on elements and components inside `EEmail`.

Migration: move the `ETailwind` `config`, `theme` and `utility` props into `app/emails/tailwind.css`, for example `@theme { --color-brand: #00dc82; }` or `@utility` blocks.

Migration: remove `<style>` blocks, custom blocks and `src=` blocks from templates and from the components they import, in Nuxt too. Use Tailwind classes or inline styles, and import local components instead of `src=`.

Migration: write every class completely in the template source. Class names built at run time, such as `` `bg-${color}-500` ``, are no longer resolved and stay in `class` unchanged.

Migration: replace `renderEmailComponent()` and `#nuxt-email/testing` with `createTestRenderer({ rootDir })` from `@lupinum/nuxt-email/testing`. It returns `renderEmail(name, props)`. Pass the `codeBlock` option when templates use `ECodeBlock`, and pass the generated `EmailTemplateProps` type for typed names and props.

Migration: replace `renderEmailComponent()` from `@lupinum/nuxt-email/render` with a registry compiled by `buildEmailRegistry()` from `@lupinum/nuxt-email/build`, and call its `renderEmail(name, props)`. `@lupinum/nuxt-email/render` now exports only what that registry imports.

Migration: install `typescript` and `vue-tsc` in projects that call `@lupinum/nuxt-email/build`. They are now optional peer dependencies.

Migration: add `unplugin-vue` to your own dependencies if your project imported it through this package.

Migration: pass `EMarkdown` content to its now required `source` prop, for example `<EMarkdown :source="body" />`. Content in its default slot now throws instead of rendering.

Migration: remove references to `DefineEmailOutsideRenderError`, `DuplicateEmailDefinitionError` and `TailwindMissingHeadError`. `@lupinum/nuxt-email/errors` now exports only `EmailRenderError` and `UnknownEmailTemplateError`.
