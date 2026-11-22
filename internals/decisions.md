# Decisions

A short, dated log of choices a future maintainer or agent might otherwise undo.
Add one line per decision: `Dn (YYYY-MM-DD): decision — why.` Replace a line
when a decision changes; git keeps the history.

- **D1 (2026-10-06): Adopt the Lupinum OSS standard (lupinum-oss 071a464, `nuxt-module` starter).** — Every
  Lupinum library shares one release, security and CI setup, so fixes to the standard apply everywhere.
  `release.yml`, `preview.yml`, `scripts/release.mjs`, `scripts/lint-changesets.mjs`, `scripts/audit-deps.mjs`
  and `scripts/agent-docs.mjs` are copies from the starter; change them there first. Changesets replaces
  changelogen and `publish.yml`; existing versions and public exports stay the same. Pre mode keeps the
  `beta` line (`1.0.0-beta.4` → `1.0.0-beta.5`) until the maintainer exits it.
- **D2 (2026-11-12): Test the real package and compiler boundaries.** — `pnpm verify` runs server isolation,
  module and fixture types, owned golden files of the rendered output, the docs build, the packaged agent docs and
  isolated consumers of the packed tarball at the minimum and current Nuxt and Vue versions
  (`scripts/test-packed.ts`). These checks catch what users would hit: template leaks into client bundles,
  broken exports and output changes. The React Email oracle was removed with the runtime Tailwind path (D6).
- **D3 (2026-11-12): Keep two extra CI jobs.** — `ci.yml` runs one `verify` job (`pnpm verify`) instead of the
  starter's task matrix, because the build and the packed consumers share one install and one build. A
  `compatibility` job runs the compiler checks on the Node floor and on Windows and macOS. The final `ci` job
  needs both.
- **D4 (2026-10-06): Keep the email proof and consumer tooling above the script budget
  (FILE-08: lean).** — `scripts/test-packed.ts` and `scripts/proofs/` hold most of the lines in `scripts/`.
  The first guards the published package in real consumers; the second renders the email-client proof batch
  that the client QA checklist needs. Neither has a smaller replacement.
- **D5 (2026-10-06): One Tailwind compiler version.** — The exact `tailwindcss` pin keeps the build-time email
  engine, the docs site and the tests on the same compiler, because the engine rewrites that compiler's
  output and breaks silently on a different one.
- **D6 (2026-11-22): Resolve Tailwind classes at build time, with one compile path for every entry.** — The Nuxt
  module, `@lupinum/nuxt-email/build` and `createTestRenderer()` compile templates with one function,
  `compileEmailDirectory()` (esbuild, one SFC step, one transform, one style table from the files the bundle
  read), so they render the same bytes, and production renders carry no Tailwind or Lightning CSS code ([ADR 0003](../docs/architecture/0003-build-time-tailwind.md)). Owned golden files in
  `test/render/golden/` replace the React Email oracle.
- **D7 (2026-11-12): Nothing under `src/runtime/` imports from `src/compiler/`.** — The compiler, including the
  Tailwind engine and its reads of Tailwind's stylesheets, runs only at build time; an import from the runtime would put
  it back into production bundles. ESLint enforces the rule.
- **D8 (2026-11-12): `@lupinum/nuxt-email/errors` is the one documented import for `EmailRenderError` and
  `UnknownEmailTemplateError`.** — `/render` and `/testing` re-export the same classes, so `instanceof` works
  whichever entry a test or backend imports.
- **D9 (2026-11-12): `typescript` and `vue-tsc` are optional peer dependencies.** — Only
  `@lupinum/nuxt-email/build` needs them, to emit template declarations; Nuxt applications already have them,
  and other users should not install a compiler they never run. `/build` fails with an install hint when
  they are missing.
- **D10 (2026-11-12): Runtime dependencies use caret ranges at the locked version, except `tailwindcss` (D5).**
  — Exact pins blocked users from deduplicating patch releases; the lockfile still fixes what CI tests.
- **D11 (2026-11-22): Generated CSS uses `px`, hex and `rgba()`, and Lightning CSS does the standard CSS
  conversion.** — Outlook on Windows does not read `rem`, and email clients do not support `oklch()`, nesting
  or media range syntax. Owned steps stay only where Lightning CSS does not do the job or changes the result
  (`var()`, `calc()`, `oklch()` clipping, logical shorthands; see ADR 0003). The forbidden-syntax test in
  `test/render/css-output.test.ts` fails when a utility gains or loses such syntax.
- **D12 (2026-11-22): The SFC compile step is the package's own esbuild plugin (`src/compiler/compile-sfc.ts`),
  not `unplugin-vue/esbuild`.** — That plugin compiles `lang="ts"` through Vite, which loads the nearest
  `tsconfig.json`. A Nuxt project's `tsconfig.json` extends `.nuxt/tsconfig.json`, which does not exist before
  `nuxt prepare`, so `/build` and `createTestRenderer()` failed with "Tsconfig not found". It was tried twice.
- **D13 (2026-11-22): Templates compile to normal render functions, not to SSR render functions.** — SSR mode
  gave the same golden files but only 3.8% faster renders of the 48-row email (3.36 ms against 3.50 ms). That
  does not pay for a second compile mode.
- **D14 (2026-11-22): A template reaches the class lookup as `_ctx._tw`, a global property of the Vue app of
  one render.** — A compiled template reads an unknown identifier from `_ctx`, which falls through to
  `app.config.globalProperties`, so no `inject()` runs for each element. This needs `inlineTemplate: false` in
  `compile-sfc.ts`; an inlined template does not see global properties. `EEmail` reads the render state with `inject`.
- **D15 (2026-11-22): Tailwind's `theme.css` is imported with `theme(inline)`.** — Theme values then arrive as
  values in the utilities, and the owned `var()` resolver handles only what remains (`--tw-*` variables and
  tokens from `app/emails/tailwind.css`).
- **D16 (2026-11-22): The value of `text-decoration-line` becomes `text-decoration` at render, not in the style
  table.** — Outlook on Windows reads only the shorthand. Replacing the property in the table reset a decoration
  color or thickness in two cases: a plain rule in `tailwind.css` comes after the utilities, and an `!important`
  shorthand beats the longhands after it. At render the shorthand is always the first declaration
  (`withDecorationShorthand` in `src/runtime/tw.ts`).
- **D17 (2026-11-22): `createTestRenderer()` fails a render that keeps a class as written; production does
  not.** — A wrong or run-time class name gives an unstyled element without an error, and an opt-in check does
  not find it. The list of kept classes comes from `inspectEmail`, which only the development and test
  registries export, so diagnostics never change `RenderedEmail` or reach production.
- **D18 (2026-11-22): Not built until a project needs it: right-to-left output for logical utilities, packages
  in `node_modules` as email source, and attributes on `<html>`.** — Each needs a new mechanism (a second set of
  declarations chosen by `dir`, an option that names packages to read and compile, pass-through props on
  `EEmail`). The Tailwind guide lists the first two as limits.
- **D19 (2026-11-22): The Node floor is the floor of the Nuxt version that CI tests as "current"
  (`^22.22.3 || ^24.15.0 || ^26.0.0` for Nuxt 4.6).** — The pinned development Nuxt is also the current Nuxt
  of the packed-consumer test, so it must follow Nuxt, or the package is never tested on the Nuxt that users
  install. Nuxt 4.6 no longer supports Node 22.18 and 24.11, and CI must not prove a floor on a Nuxt that does
  not support it. The peer range `>=4.5.1 <5` stays; the minimum consumer still installs Nuxt 4.5.1.
- **D20 (2026-11-22): The four Shiki packages are optional peer dependencies.** — Only `ECodeBlock` needs
  them, and it is opt-in, so every other user installed about 40 packages for nothing. An application that
  sets `codeBlock` installs them; setup and `createTestRenderer()` fail with the install instruction when they
  are missing, also when only one of the four is (`src/code-block/shiki-packages.ts`). Nothing outside `src/code-block/options.ts` and the
  generated component may import a Shiki package at run time; the packed default consumer proves it by
  installing without Shiki.
- **D21 (2026-11-22): `ELink` and `ECodeInline` remove the whitespace at the edges of their content.** —
  The Nuxt ESLint style rules put the content of a component with attributes on its own lines, and Vue keeps
  each line break as a space. In the first Apple Mail check of `1.0.0-beta.6` the underline ran past the
  link text, and a space came before the full stop. JSX drops this whitespace, so React Email does not have
  the defect. Only these two inline components trim (`src/runtime/components/slot-text.ts`); block
  components do not need it, and a non-breaking space stays.
