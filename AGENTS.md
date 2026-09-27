# Nuxt Email

Typed Vue email templates for Nuxt and standalone Node rendering. The application
owns recipients and delivery. Follow [Lupinum OSS](https://oss.lupinum.com) for
maintenance and releases; local exceptions and adoption gates are in `DECISIONS.md`.

## Commands

Use the Node and pnpm versions in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm dev                         # playground
pnpm build                       # module and standalone compiler
pnpm typecheck                   # module, fixtures and playground
pnpm test                        # unit, conformance and production isolation
pnpm test:packed                 # docs build, real tarball, isolated consumers
pnpm verify                      # complete CI gate
```

`verify` checks the React Email oracle against source commit
`15419ff1f4cd0e32ed2c15a4a9182cc47a200a60`. Set
`NUXT_EMAIL_REACT_EMAIL_CHECKOUT` to an existing checkout at that exact commit;
CI checks it out under `.oracle/react-email`. Do not substitute a different ref.
Focused commands include `test:conformance`, `conformance:check`, `oracle:check`
and `docs:build`. Regenerate the oracle/report through their write commands only.

## Boundaries

- Keep one template registry and one rendering core; dev preview shares it.
- Templates and rendering stay on the server. Exclude preview fixtures from production.
- The active application owns its registry; Nuxt layers do not merge templates.
- Do not add delivery adapters, send endpoints, recipient policy or a second renderer.
- Syntax highlighting stays opt-in with a closed language set.
- `examples/better-convex` is copied into a consumer. Its adapter typecheck belongs
  to that consumer's installed Better Convex contract and generated declarations.

Run focused tests for changed behavior and `verify` for handoff. Keep the docs
source in `docs/` and follow `docs/WRITING.md`. Preserve legal text and generated
conformance evidence. Do not hand-edit `.nuxt`, `.output`, `dist`, or generated docs.

Add a Changeset for package behavior or dependency changes: one present-tense
user-facing line beginning Fix, Add, Remove or Change. Breaking changes include
`Migration:` guidance. Use an empty Changeset for invisible internal changes.

Agents do not publish, approve npm deployments, move dist-tags, or handle
publication credentials. Provider adoption in `DECISIONS.md` must be completed
before this workflow can be considered release-ready.
