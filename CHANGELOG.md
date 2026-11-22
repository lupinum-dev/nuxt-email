# Changelog

## 1.0.0-beta.6

### Major Changes

- [#77](https://github.com/lupinum-dev/nuxt-email/pull/77) [`638353c`](https://github.com/lupinum-dev/nuxt-email/commit/638353ccc2a8319f891944d92edf05d31dd6405f) Thanks [@Mat4m0](https://github.com/Mat4m0)! - Change email templates to one `EEmail` root with Tailwind classes resolved at build time, so a production render no longer loads Tailwind or a CSS parser.
  
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
  
  Migration: write every class completely in the template source, or list the possible names with `@source inline()` in `app/emails/tailwind.css`. Other class names built at run time, such as `` `bg-${color}-500` ``, are no longer resolved and stay in `class` unchanged.
  
  Migration: replace `renderEmailComponent()` and `#nuxt-email/testing` with `createTestRenderer({ rootDir })` from `@lupinum/nuxt-email/testing`. It returns `renderEmail(name, props)`. Pass the `codeBlock` option when templates use `ECodeBlock`, and pass the generated `EmailTemplateProps` type for typed names and props.
  
  Migration: replace `renderEmailComponent()` from `@lupinum/nuxt-email/render` with a registry compiled by `buildEmailRegistry()` from `@lupinum/nuxt-email/build`, and call its `renderEmail(name, props)`. `@lupinum/nuxt-email/render` now exports only what that registry imports.
  
  Migration: install `typescript` and `vue-tsc` in projects that call `@lupinum/nuxt-email/build`. They are now optional peer dependencies.
  
  Migration: add `unplugin-vue` to your own dependencies if your project imported it through this package.
  
  Migration: pass `EMarkdown` content to its now required `source` prop, for example `<EMarkdown :source="body" />`. Content in its default slot now throws instead of rendering.
  
  Migration: remove references to `DefineEmailOutsideRenderError`, `DuplicateEmailDefinitionError` and `TailwindMissingHeadError`. `@lupinum/nuxt-email/errors` now exports only `EmailRenderError` and `UnknownEmailTemplateError`.

- [#85](https://github.com/lupinum-dev/nuxt-email/pull/85) [`ae171fe`](https://github.com/lupinum-dev/nuxt-email/commit/ae171fe0d9b00536fbe089593e5f2879549adf3a) Thanks [@Mat4m0](https://github.com/Mat4m0)! - Change the minimum Node.js versions to 22.22.3 and 24.15.0, the versions that Nuxt 4.6 supports.
  
  The package is now tested with Nuxt 4.6.4 as the current Nuxt version. The supported Nuxt range `>=4.5.1 <5` does not change.
  
  Migration: update Node.js to 22.22.3 or newer on the Node 22 line, or to 24.15.0 or newer on the Node 24 line. Node 26 needs no change.

- [#89](https://github.com/lupinum-dev/nuxt-email/pull/89) [`49b31de`](https://github.com/lupinum-dev/nuxt-email/commit/49b31de3182941eec8dc8ddf731a0afe835b5cfe) Thanks [@Mat4m0](https://github.com/Mat4m0)! - Change the Shiki packages to optional peer dependencies, so only applications that use `ECodeBlock` install them.
  
  The package no longer installs `@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs` and `@shikijs/themes`. Syntax highlighting works as before once they are installed. If `codeBlock` is set and they are missing, module setup and `createTestRenderer()` fail with the install instruction.
  
  Migration: if your `nuxt.config.ts` sets `nuxtEmail.codeBlock`, run `pnpm add @shikijs/core @shikijs/engine-javascript @shikijs/langs @shikijs/themes`. Applications without `codeBlock` need no change.

### Minor Changes

- [#79](https://github.com/lupinum-dev/nuxt-email/pull/79) [`8c5c391`](https://github.com/lupinum-dev/nuxt-email/commit/8c5c39165165d0084a27db049dfa76e18b81b19f) Thanks [@Mat4m0](https://github.com/Mat4m0)! - Add `@source inline()` in `app/emails/tailwind.css` for class names that are built at run time, and make `createTestRenderer()` fail on classes that have no effect.
  
  `@source inline("text-{red,emerald}-600")` adds classes that are not written completely in the source, for example a name built from a prop. Tailwind expands the braces. `@source` with a path was ignored and now fails the build with a clear message.
  
  The `renderEmail` function of `createTestRenderer()` fails when a render keeps a class as written: a wrong name, a name built at run time, or a utility that only changes another class. List the classes that must stay in the new `allowUnknownClasses` option, or pass `true` to allow every class. Production renders and the development preview do not change.
  
  A class that a plain rule in `tailwind.css` defines is now known to the build even when its name is built at run time.
  
  Fix named `group` and `peer` marker classes such as `group/item`: they now get the class name that the `group-hover/item:` rule selects.

### Patch Changes

- [#80](https://github.com/lupinum-dev/nuxt-email/pull/80) [`03c50d3`](https://github.com/lupinum-dev/nuxt-email/commit/03c50d3a68b089be9c10269ed6243ca367f97043) Thanks [@Mat4m0](https://github.com/Mat4m0)! - Fix the `underline`, `no-underline` and `line-through` classes and the `EMarkdown` heading sizes in Outlook on Windows.
  
  An inline style writes the line as `text-decoration` at its start instead of `text-decoration-line`, because Outlook on Windows reads only the shorthand. Before, a link with `no-underline` stayed underlined there, and `underline` had no effect. Other clients show the same result as before.
  
  The default heading sizes of `EMarkdown` are `px` instead of `rem` (`40px` for a first-level heading), which is the same size at the default font size of 16 px. Outlook on Windows does not support `rem` and showed its default size.
  
  Fix the condition of a `supports-[…]:` variant, which was written with `!important` and never matched.

## 1.0.0-beta.5

### Patch Changes

- [#63](https://github.com/lupinum-dev/nuxt-email/pull/63) [`8ceae4a`](https://github.com/lupinum-dev/nuxt-email/commit/8ceae4a7cf9439962e03f01ceb50bffa0b8fdd0f) Thanks [@Mat4m0](https://github.com/Mat4m0)! - Fix conditional and child utility styles with the current Tailwind compiler, and fail instead of dropping unsupported conditions.
  
  `ETailwind` keeps media-query, pseudo-class, child (`*:`, `**:`) and arbitrary selector variants such as `[:where(&)]:` with their conditions. Supported wrappers around a utility are `@media` and `@supports` (`@layer` is ignored). A utility inside any other at-rule now throws, for example `@container` variants (`@sm:`) or custom CSS in the `ETailwind` `utility` prop that wraps a class in `@scope` or `@container`. It throws `Unable to render Tailwind CSS: @<name> rules are not supported.` Before, the condition was dropped silently and the style applied everywhere.
  
  Migration: remove `@container` variants (`@sm:`, `@md:` and so on) from email templates, and move custom CSS in the `ETailwind` `utility` prop out of `@container`, `@scope` and other unsupported at-rules, or rewrite the condition with `@media` or `@supports`.

## v1.0.0-beta.4

[compare changes](https://github.com/lupinum-dev/nuxt-email/compare/v1.0.0-beta.3...v1.0.0-beta.4)

### 🚀 Enhancements

- **docs:** Ship versioned package guidance ([#55](https://github.com/lupinum-dev/nuxt-email/pull/55))

### 🩹 Fixes

- **deps:** Clear workspace advisories and update Vitest ([#54](https://github.com/lupinum-dev/nuxt-email/pull/54))

### ❤️ Contributors

- Matthias Amon

## v1.0.0-beta.3

[compare changes](https://github.com/lupinum-dev/nuxt-email/compare/v1.0.0-beta.2...v1.0.0-beta.3)

### 🩹 Fixes

- **deps:** Enforce expiring quarantine exceptions ([#47](https://github.com/lupinum-dev/nuxt-email/pull/47))
- **preview:** Bundle configured renderer during development ([#48](https://github.com/lupinum-dev/nuxt-email/pull/48))
- **compatibility:** Prove supported Nuxt and Vue ranges ([#50](https://github.com/lupinum-dev/nuxt-email/pull/50))

### 🏡 Chore

- **maintenance:** Verify Email commands without repeated CI work ([#49](https://github.com/lupinum-dev/nuxt-email/pull/49))

### ❤️ Contributors

- Matthias Amon

## v1.0.0-beta.2

### Added

- Added `@lupinum/nuxt-email/build` to compile the existing typed email
  registry for Node runtimes outside Nitro.
- Added `@lupinum/nuxt-email/render` so compiled templates reuse the same
  deterministic renderer, metadata, plain-text generation, and email-safe
  components as Nuxt applications.

### Production boundaries

- Keep delivery, retries, idempotency, provider credentials, and audit state
  application-owned. The package compiles and renders email; it does not send.
- Reject source directories outside the application root, refuse to replace
  output not owned by Nuxt Email, and preserve the last valid registry when a
  build fails.
- Exclude preview fixtures and source templates from the generated production
  registry.

## v1.0.0-beta.1

Status: published on npm's `next` tag. Feature development is frozen until stable `1.0.0`. The three-client beta smoke test passed; the full eight-client checklist and external transactional beta remain pending.

### Added

- Added synchronous `subject` and authored plain-text `text` metadata to `defineEmail`, including prop-derived functions. Authored text takes precedence over automatic HTML-to-text derivation.
- Added the type-only `EmailComponentProps<Component>` helper for deterministic, component-checked preview fixtures.
- Added a baseURL-aware Nuxt DevTools shortcut to the existing development-only `/__email` preview.
- Added direct Resend and local Nodemailer/Mailpit sending recipes while keeping all delivery behavior application-owned.

### Changed

- Rebuilt Tailwind v4 nested-selector and nested `@media`/`@supports` handling so declarations and rules preserve source order, media ranges are downleveled, and unhandled nesting fails instead of emitting raw `&` CSS.
- Limited emitted keyframes to animations referenced by the current render. Animation remains best-effort progressive enhancement because email-client support is limited.
- Made `EHtml.lang` a required, non-empty value. `dir` still defaults to `ltr`.
- Made `ELink` visually neutral by removing its built-in color and underline. `target="_blank"` remains the default and can be overridden.
- Renamed `EmailRenderError.componentName` to `templateName` and kept the original error as `cause`.
- Limited module-driven registry rebuilds to structural template and fixture changes; ordinary edits continue through Nitro's normal watcher.

### Breaking changes from v0.1.1

- Every `EHtml` now requires an explicit non-empty `lang`.
- `ELink` no longer supplies color or text-decoration styles. Add those styles explicitly where required.
- Read `EmailRenderError.templateName` instead of `componentName`; there is no compatibility alias.
- `defineEmail` rejects an empty object and invalid or asynchronous metadata values. Provide at least one synchronous `subject` or `text` value.

## v0.1.1

[Compare changes](https://github.com/lupinum-dev/nuxt-email/compare/e45025a...v0.1.1)

### Changed

- Isolated the package-preview watcher test from the normal unit-test process. This change prevents an open watcher from delaying test completion. ([#9](https://github.com/lupinum-dev/nuxt-email/pull/9))

### Release reliability

- Added exact-byte recovery for a first package version that was published from a certified artifact before npm trusted publishing was available. The workflow rejects different package bytes and requires explicit bootstrap authorization. ([#8](https://github.com/lupinum-dev/nuxt-email/pull/8), [#10](https://github.com/lupinum-dev/nuxt-email/pull/10), [#11](https://github.com/lupinum-dev/nuxt-email/pull/11))
- Made package previews reliable after a cold start on Windows. ([#12](https://github.com/lupinum-dev/nuxt-email/pull/12))
- Corrected missing-tag handling and artifact checksum verification in the protected release workflow. ([#13](https://github.com/lupinum-dev/nuxt-email/pull/13), [#14](https://github.com/lupinum-dev/nuxt-email/pull/14))

### Compatibility

- The runtime files are unchanged from `0.1.0`. This patch aligns the published package metadata with the current certified source and establishes the normal trusted-publishing path for later releases.

## v0.1.0

Status: pre-1.0 candidate. The package identity is `@lupinum/nuxt-email`; the unscoped npm package is unrelated. Manual email-client QA and external beta evidence remain release gates.

### Added

- Ordinary Vue SFC email authoring under recursive `app/emails/` discovery.
- Eighteen built-in auto-registered components: the document and layout primitives `EHtml`, `EHead`, `EBody`, `EContainer`, `ESection`, `ERow`, `EColumn`, `EHr`; the content primitives `EHeading`, `EText`, `ELink`, `EImg`, the Outlook-safe `EButton`, and the hidden `EPreview` preheader; plus `EFont`, `ECodeInline`, `EMarkdown`, and `ETailwind`.
- Opt-in `ECodeBlock` syntax highlighting with one configured Shiki theme, a closed language allowlist, inline token colors, email-safe wrapping, optional line numbers, and a Nuxt-config-aware `#nuxt-email/testing` binding.
- Email-safe Tailwind v4 through `ETailwind`: render-time class inlining, including utilities emitted inside nested components, with non-inlinable rules downleveled and injected into a `<head>` `<style>`.
- `EMarkdown` conversion of Markdown source to email-safe HTML with react-dom-compatible inline styles, raw-HTML rejection, safe URL-scheme validation, and escaped code content.
- Optional `defineEmail({ subject: () => string })`, imported from `@lupinum/nuxt-email/define-email`, that captures the template's real props in a closure; the subject is returned as `subject` on the render result and shown in the preview.
- Deterministic complete-document HTML rendering and plain-text fallback generation.
- A generated Nitro-only `renderEmail(name, props)` API with typed template names and Vue props, returning `{ html, text, subject? }`.
- One canonical server registry shared by runtime rendering and development preview.
- First-class testing utilities on the `@lupinum/nuxt-email/testing` subpath: `renderEmailComponent`, `EmailRenderError`, and the `RenderedEmail` type.
- Stable focused entry points for `@lupinum/nuxt-email/define-email` and `@lupinum/nuxt-email/errors`.
- Exact sibling `.fixtures.ts` preview data and a development-only `/__email` application with a sandboxed preview, HTML, plain-text, copy/open actions, and automatic refresh.
- Preview enhancements: a computed subject bar, a 600px/375px/full viewport toggle, and an exact UTF-8 byte-size badge with an approximate Gmail clipping-budget warning.
- An email-client proof kit (`proofs:generate`, `proofs:send`) that renders a representative batch to `.html`, `.txt`, and valid `multipart/alternative` `.eml` messages with an optional Resend send path, plus a client QA checklist.
- Actionable unknown-template, duplicate-template, discovery, document, prop, and render errors with preserved causes where applicable.
- React Email `6.9.0` and `@react-email/render` `2.1.0` behavioral oracle, generated conformance report, deterministic renderer measurements, production boundary tests, package inspection, and an isolated fresh-install verification workflow.
- A cross-platform CI matrix (Linux, macOS, Windows on Node 22, 24, and 26) running lint, type checks, and the full test suite, with the runtime-heavy oracle, conformance, and package/fresh-install checks run once on Linux, and a documentation-site build job.
- MIT project license, third-party notices, provenance record, email-client QA checklist, and external beta record.

### Security and production boundaries

- Vue interpolation and attributes remain escaped by default.
- The component set has no raw-HTML primitive and rejects content-replacement and event-handler attributes.
- The canonical generated rendering path excludes the renderer and templates from application client bundles.
- The canonical discovery path excludes preview UI, preview endpoints, and fixture modules from production builds.
- The preview iframe is sandboxed and raw preview output uses a restrictive content security policy.
- No public render endpoint or send endpoint is generated for production.

### Intentional scope

- Supported behavior is reported per case in the generated [conformance report](https://github.com/lupinum-dev/nuxt-email/blob/main/docs/conformance/report.md); this release does not claim full React Email compatibility.
- Provider adapters, send endpoints, JSX, React streaming, edge runtimes, raw HTML, configurable discovery paths, and a public registry protocol are not part of v1. `codeBlock` is the sole module option.
- Sending remains application-owned: callers pass `{ html, text, subject? }` to their selected provider SDK.

### Supported environment

- Node.js `^22.18.0 || ^24.11.0 || ^26.0.0`.
- Nuxt `>=4.5.1 <5`.
- Vue `^3.5.40`.

The repository's v1.0 readiness gate records the current contract and remaining approval steps; the live release ledger is intentionally excluded from the npm tarball.
