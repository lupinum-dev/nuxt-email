# Contributing

## Read this first

Nuxt Email currently accepts limited contributions. You can open an issue or a
pull request, but Lupinum OG can close or defer work that does not fit the
current direction.

We are most likely to accept small bug fixes, reliability fixes, focused
documentation corrections, and maintenance that reduces complexity.

Open an issue before you start a feature, a breaking change, or a large
refactor.

## Prepare the repository

Use the Node and pnpm versions in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm dev:prepare
pnpm lint
pnpm test:types
pnpm test
```

Run `pnpm release:verify` when you change package metadata, exports, release
scripts, or release workflows.

## Keep the change focused

- Put one concern in each pull request.
- Explain what changed and why it is necessary.
- Add tests for invariants and failure behavior.
- Update public documentation when user behavior changes.
- Add before-and-after images for a visual change.
- Keep fixtures free of customer data, credentials, and private URLs.
- Use Conventional Commits.

Do not add delivery-provider adapters, send endpoints, raw-HTML primitives, a
second renderer, or compatibility aliases without an accepted design issue.
