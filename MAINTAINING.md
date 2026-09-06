# Maintaining Nuxt Email

This file is for Lupinum OG maintainers. Contributors use
[CONTRIBUTING.md](./CONTRIBUTING.md).

## Sources of truth

- `package.json` owns the package name, version, exports, and commands.
- `CHANGELOG.md` owns release history.
- `pnpm-lock.yaml` owns resolved dependencies.
- `docs/conformance/report.md` is generated conformance evidence.
- The retained `.tgz` file is the release candidate.

Do not create a second version file or rebuild after certification.

## Daily maintenance

An assigned routine task includes setup, diagnosis, implementation, independent
review, authorized protected merge, post-merge verification, and cleanup.
Routine work has bounded scope, preserves public contracts and permissions,
and has a known rollback. Meaningful code, CI, and dependency changes need
independent review of the final diff. Preserve unrelated work. Ask for unresolved
product or compatibility decisions, destructive actions, security or delegation
changes, and protected approvals. User instructions and access controls take
precedence; a pull request cannot expand its own authority. npm publication
keeps its human approval.

Use the Node and pnpm versions in `package.json`. Install with
`pnpm install --frozen-lockfile`, then start `pnpm dev`. Open the printed local
URL and `/__email`; select a template and check the rendered HTML and text.
Check a narrow viewport and browser errors. Stop the server when finished.
The playground and docs use workspace source; the release check separately
installs the retained tarball outside the repository.

Use focused commands while editing. Run `pnpm verify` before handoff or
`pnpm release:verify` for package and release changes; it includes `verify`.
Do not rerun completed child checks without a new change or failure. A failed
or skipped required check blocks completion. Verify hosted results after merge
and remove owned processes and disposable state.

`pnpm build` builds the public module. `pnpm test` runs each case once and checks
the conformance report from those results. `pnpm conformance:check` is the focused
report command. CI runs the pinned upstream React Email oracle once. It certifies
the package after its explicit policy, audit, lint, type, test, and oracle gates;
the separate docs lane builds the site. Standalone `pnpm release:artifact` and
package previews retain the complete `release:verify` gate. `pnpm release:pack`
is the focused tarball and consumer check, not a substitute for that gate.

## Quick fixes

Keep one cause and one verification path in the pull request. Add a regression
test when the defect can return. Run `pnpm verify` before handoff.

## Large changes

Open an issue first. Split the work by public behavior. Keep rendering,
conformance evidence, tests, and documentation aligned.

## Documentation changes

Follow [docs/WRITING.md](./docs/WRITING.md). Use `pnpm docs:build` for focused
iteration, then `pnpm verify` once for handoff; it includes the docs build.

## Review dependencies

Renovate opens focused dependency pull requests. It does not merge them.

For each update:

1. Review the upstream release and provenance.
2. Review lifecycle-script changes.
3. Keep build-script permissions closed to dependencies that need them.
4. Run focused checks while editing, then `pnpm release:verify` for runtime
   or package dependencies, or `pnpm verify` for other workspace dependencies.
5. Run `pnpm oracle:check` when the React Email oracle changes. It needs the
   exact upstream source checkout recorded in the oracle metadata; set
   `NUXT_EMAIL_REACT_EMAIL_CHECKOUT` to that checkout.

`pnpm check:dependencies` checks the actual root install policy. The same
checker runs before packed-consumer installation and daily in CI. Emergency
exceptions must name one exact version with inline JSON `reason`, `owner`, and
UTC `expires` within 24 hours. Remove an expired exception; do not extend it
silently. Packed consumers enforce the age policy with their own reviewed build
permissions and no root dependency overrides.

Do not bypass the dependency release-age policy for convenience.

## Prepare a release

1. Use Conventional Commits on protected `main`.
2. Prepare the version and changelog:

   ```bash
   pnpm release:prepare
   ```

   Review the generated version and text. The command does not commit, tag,
   push, or publish.
3. Run `pnpm release:verify` from a clean commit.
4. Complete the real-client QA checklist for release-facing render changes.
5. Merge the release pull request after every required check passes.
6. Start the protected publish workflow from `main`.
7. Approve the `npm` environment after you inspect the certified artifact.
8. Verify npm provenance, the dist-tag, and the GitHub release.

Prereleases use the shared `next` dist-tag. Stable releases use `latest`.

The protected publish job must download the certified tarball. It must not check
out source, install dependencies, or run repository scripts while it has an
OIDC publication token.

Never use an `NPM_TOKEN`. Do not publish from a workstation after trusted
publishing is configured.

## Recover a release

Rerun the protected publish workflow with the same version when npm or GitHub
fails after publication starts. Before the protected environment is approved,
an unprivileged job verifies existing npm bytes and cryptographically binds npm
provenance to this repository's `publish.yml`, `main`, the exact source commit,
and the certified tarball. The protected job rejects any registry existence or
byte change after that check. It never installs or runs repository code.

Immutable versions created before trusted publishing are historical exceptions;
they are not valid inputs to the current recovery workflow. Every version first
published by the workflow requires OIDC provenance. The workflow also requires
the expected dist-tag before it creates or repairs the GitHub release. Release
repair verifies the tag's final commit, including annotated tags, restores the
correct prerelease state, and replaces only the certified tarball asset. If
GitHub cannot create a historical tag with the workflow token, the failed job
prints the exact `gh api` command a maintainer must run before retrying only the
GitHub Release job.

Do not unpublish unless npm policy and a confirmed security incident require
it. Deprecate a defective version, restore the last known-good dist-tag, and
publish a forward fix with a new version.

## Respond to a credential incident

Stop release workflows and revoke the affected credential or trusted-publisher
binding. Review GitHub audit logs, workflow changes, tags, releases, and npm
access. Restore publishing only after the source commit and retained artifact
are verified.

## Audit external settings

Review these settings in January and July, and after an ownership or release
workflow change.

GitHub must have:

- a protected `main` branch with pull requests, linear history, resolved review
  threads, and the repository's required CI checks;
- squash merge as the only merge method, auto-merge enabled, and merged branches
  deleted automatically;
- GitHub Actions restricted to full commit-SHA references, with default
  workflow permissions read-only;
- Issues enabled for public reports, with Wikis and Discussions disabled so
  versioned repository documentation remains authoritative;
- protected release tags;
- an `npm` environment that allows only `main`, requires a reviewer, and has no
  package token;
- private vulnerability reporting, secret scanning, push protection, automated
  security fixes, and CodeQL Default Setup for JavaScript and TypeScript;
- Renovate for routine dependency updates and CodeRabbit as an advisory reviewer.

npm must bind `@lupinum/nuxt-email` to `publish.yml` and the `npm` environment
through trusted publishing.

Vercel must deploy the `docs/` app from `main` to `nuxt-email.lupinum.com` and
use the on-demand preview workflow for reviewed commits. Automatic library
branch previews stay disabled. Use Basic build machines unless measured total
successful-build cost or a build failure justifies another machine. Disable
on-demand concurrency so builds queue. Set the Vercel Root Directory to `docs`. Enable
source files outside the Root Directory so the app can build the local package.
Do not set an Output Directory override; Nuxt emits the Vercel Build Output API
files. Do not set an Install Command override. Vercel detects pnpm from the
repository lockfile and installs the workspace. `docs/vercel.json` owns the
exact build contract.


## Adoption evidence

The September 6, 2026 trial follows Lupinum OSS revision `da57890`. The documented
`pnpm dev` journey exposed a configured-code-block preview failure. A focused
test rejects the original implementation and passes the repaired renderer.
Desktop and 390-pixel browser checks covered template selection, HTML and plain
text, live fixture updates, missing-fixture recovery, and horizontal overflow.
The active template and representation survived a fixture data edit. Owned
processes and temporary edits were removed. Hosted operating-system and Node
matrix checks remain separate evidence.
