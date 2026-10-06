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
- **D2 (2026-09-28): Test the real package and compiler boundaries.** — `pnpm verify` runs the React Email
  oracle, the conformance report, server isolation, module and fixture types, the docs build, the packaged
  agent docs and isolated consumers of the packed tarball at the minimum and current Nuxt and Vue versions
  (`scripts/test-packed.ts`). These checks catch what users would hit: template leaks into client bundles,
  broken exports and rendering differences from React Email.
- **D3 (2026-10-06): Keep two extra CI jobs.** — `ci.yml` runs one `verify` job (`pnpm verify` with the
  pinned React Email checkout, about 30 minutes) instead of the starter's task matrix, because the oracle,
  the build and the packed consumers share one install and one build. A `compatibility` job runs the
  compiler checks on the Node floor and on Windows and macOS. The final `ci` job needs both.
- **D4 (2026-10-06): Keep the email proof and consumer tooling above the script budget
  (FILE-08: lean).** — `scripts/test-packed.ts` and `scripts/proofs/` hold most of the lines in `scripts/`.
  The first guards the published package in real consumers; the second renders the email-client proof batch
  that the client QA checklist needs. Neither has a smaller replacement.
- **D5 (2026-10-06): One Tailwind compiler version.** — The `tailwindcss` override keeps the vendored email
  engine, the docs site and the tests on the same compiler, because the engine rewrites that compiler's
  output and breaks silently on a different one. Renovate groups it with `react-email` and
  `@react-email/render`.
