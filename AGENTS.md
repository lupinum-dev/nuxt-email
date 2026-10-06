# Nuxt Email

Typed Vue email templates for Nuxt and standalone Node rendering, published to
npm as `@lupinum/nuxt-email`. The application owns recipients and delivery.
Maintenance and releases follow [Lupinum OSS](https://oss.lupinum.com); local
choices and exceptions are in [internals/decisions.md](internals/decisions.md).

## Commands

Use the Node and pnpm versions in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm dev            # run the module in playground/
pnpm docs:dev       # run the documentation site
pnpm build          # module, standalone compiler, docs site and dist/agent/
pnpm typecheck      # module, fixtures and playground
pnpm test           # unit, conformance and production isolation
pnpm test:packed    # packs the `pnpm build` output and installs it in isolated consumers
pnpm format         # apply lint fixes
pnpm verify         # exactly what CI runs
pnpm changeset      # describe a user-facing change for the next release
```

`pnpm oracle:check` (part of `verify`) compares against a React Email checkout
at the commit pinned in `.github/workflows/ci.yml`. Set
`NUXT_EMAIL_REACT_EMAIL_CHECKOUT` to a checkout at exactly that commit; CI
checks it out under `.oracle/react-email`. Regenerate the oracle and the
conformance report only through `oracle:write` and `conformance:write`.

`pnpm build` also writes `dist/agent/`, a copy of the rendered docs that ships
as `@lupinum/nuxt-email/agent-docs`, so agents in consuming projects read
documentation that matches the installed version. The "Agent setup" section of
the README tells those agents how to add a pointer to it. Keep the
`./agent-docs` export and that section.

## Hard rules

- Never publish to npm, push to `main`, create tags or release by hand.
  Releases happen when a maintainer merges the "Version packages" PR and
  approves the protected `npm` environment. Do not move dist-tags.
- Never add `NPM_TOKEN` or any other long-lived publish credential.
- Add a changeset (`pnpm changeset`) to every pull request that changes what
  package users install: code, types, runtime behaviour or dependencies.
  Documentation, tests and CI changes need none. CI requires one when `src/`
  changes; use `pnpm changeset --empty` if users see nothing. A change to
  `dependencies` or `peerDependencies` needs at least a patch changeset.
- Changeset style: one summary line in present tense that starts with Fix, Add,
  Remove or Change and says what changed for users. A major change, or any
  breaking change before 1.0, adds a line that starts with `Migration:`.
- Do not bypass the 24-hour dependency quarantine (`minimumReleaseAge`). Do not
  add dependencies to `allowBuilds` without a reason.
- Pin GitHub Actions to full commit SHAs. Give each job only the permissions it needs.
- Keep tooling lean. Add a script, check or workflow only when it guards
  behaviour users rely on or closes a real attack path.

## Boundaries

- Keep one template registry and one rendering core; dev preview shares it.
- Templates and rendering stay on the server. Exclude preview fixtures from production.
- The active application owns its registry; Nuxt layers do not merge templates.
- Do not add delivery adapters, send endpoints, recipient policy or a second renderer.
- Syntax highlighting stays opt-in with a closed language set.

Run focused tests for changed behavior and `pnpm verify` for handoff. Keep the
docs source in `docs/` and follow `docs/WRITING.md`; update it in the same pull
request as the behaviour it describes. Preserve legal text and generated
conformance evidence. Do not hand-edit `.nuxt`, `.output`, `dist`, or generated docs.
