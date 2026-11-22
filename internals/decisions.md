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
