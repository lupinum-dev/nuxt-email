# Decisions

- **D1 (2026-09-28): Adopt Lupinum OSS v2 while keeping email behavior checks.**
  Three workflows replace certification artifacts, recovery ledgers, duplicate
  security checks and workflow deployments. The shared release job packs without
  credentials, checks the approved main SHA, and publishes the exact tarball with
  OIDC. It rejects registry errors and untrusted internal dependency replacements.
  Changesets replaces changelogen; existing versions and public exports stay the
  same. Pre mode retains the beta track until the maintainer explicitly exits it.
- **D2 (2026-09-28): Test the real package and compiler boundaries.**
  `verify` includes the installed React Email oracle, conformance report, server
  isolation, module/fixture types, docs build, agent docs and isolated consumers
  at current and minimum Nuxt/Vue versions. The consumer script retains package
  contents, external resolution, generated declarations, rendering and production
  exclusion checks. It no longer certifies a clean Git commit or retains a release
  artifact. Each supported Node floor and each supported operating system runs
  compiler checks; the old nine-way Cartesian matrix becomes three representative
  combinations. CI requires the aggregate `ci` check.
- **D3 (2026-09-28): Preserve native dependency quarantine and package tooling.**
  pnpm's 24-hour policy remains active for every package. Runtime compilers and
  existing security floors stay in place. Script size above the standard warning
  threshold is mainly actual compiler/consumer, documentation and email-client
  proof tooling. The existing package documentation format remains unchanged.
- **D4 (2026-09-28): Complete provider cutover before merging the workflow port.**
  npm trusted publishing must use `lupinum-dev/nuxt-email`, `release.yml`, and the
  protected `npm` environment, replacing the old `publish.yml` workflow identity.
  Verify required reviewer, main-only deployment branches and no admin bypass.
  Require `ci` from GitHub Actions, keep protected release tags and secret scanning,
  and enable CodeQL default setup. Vercel uses its Git integration with Root
  Directory `docs` and files outside the root included. Cancel pending runs from
  older workflow definitions and start a fresh current-main run; rerunning an old
  run does not add the new guards. No provider settings change in this code.
- **D5 (2026-10-06): Ignore five tooling advisories that cannot be fixed yet.**
  `pnpm audit` reports node-forge (via `@nuxt/cli` listhen) and braces (via
  nitropack) with no patched release, and simple-git (via `@nuxt/devtools`), whose
  fix needs simple-git 4, which stable devtools cannot load. All five run only in
  local dev servers or builds, not in rendered emails or the published runtime.
  `auditConfig.ignoreGhsas` in `pnpm-workspace.yaml` lists them so the audit gate
  still catches new advisories. Remove each entry once a usable fix resolves it;
  review by 2026-11-06.
