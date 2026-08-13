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

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm test:types
pnpm test
pnpm conformance:check
```

Build the documentation when public behavior or examples change:

```bash
pnpm --dir docs-site build
```

## Review dependencies

Renovate opens focused dependency pull requests. It does not merge them.

For each update:

1. Review the upstream release and provenance.
2. Review lifecycle-script changes.
3. Keep build-script permissions closed to dependencies that need them.
4. Run lint, types, and tests.
5. Run `pnpm oracle:check` when the React Email oracle changes.
6. Run `pnpm release:verify` when runtime or package dependencies change.

Do not bypass the dependency release-age policy for convenience.

## Prepare a release

1. Use Conventional Commits on protected `main`.
2. Prepare the version and changelog:

   ```bash
   pnpm release:prepare -- -r 0.1.0-rc.1
   ```

   Replace the example version. Review the generated text. The command does not
   commit, tag, push, or publish.
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

Do not unpublish unless npm policy and a confirmed security incident require
it. Deprecate a defective version, restore the last known-good dist-tag, and
publish a forward fix with a new version.

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

Vercel must deploy `docs-site/` from `main` to `nuxt-email.lupinum.com` and
create pull-request previews. `docs-site/vercel.json` owns the exact pnpm
installer because Vercel does not provide pnpm 11 by default.
