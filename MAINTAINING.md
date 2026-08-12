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
2. Update the version in `package.json`.
3. Generate and review `CHANGELOG.md` with Changelogen.
4. Run `pnpm release:verify` from a clean commit.
5. Complete the real-client QA checklist for release-facing render changes.
6. Merge the release pull request after every required check passes.
7. Start the protected publish workflow from `main`.
8. Approve the `npm` environment after you inspect the certified artifact.
9. Verify npm provenance, the dist-tag, and the GitHub release.

The protected publish job must download the certified tarball. It must not check
out source, install dependencies, or run repository scripts while it has an
OIDC publication token.

Never use an `NPM_TOKEN`. Do not publish from a workstation after trusted
publishing is configured.

## Recover a release

Do not unpublish unless npm policy and a confirmed security incident require
it. Deprecate a defective version, restore the last known-good dist-tag, and
publish a forward fix with a new version.
