# Repository instructions

## Purpose

Nuxt Email lets Nuxt applications author typed transactional emails as Vue
components. It renders email on the Nitro server. The application owns delivery.

Keep one template registry and one rendering core. Do not add provider adapters,
send endpoints, a second renderer, or a second metadata format without an
accepted design decision.

## Repository map

- `src/` contains the published Nuxt module and server runtime.
- `test/` contains unit, conformance, fixture, and package tests.
- `docs/` contains the public Ginko Docs site and versioned engineering records.
- `docs/` contains conformance evidence and release checklists.
- `playground/` contains the development application.
- `scripts/` contains release verification and proof generation.
- `MAINTAINING.md` contains dependency and release procedures.

## Sources of truth

- `package.json` owns package metadata, versions, exports, and commands.
- `pnpm-lock.yaml` owns resolved dependencies.
- `src/` owns runtime behavior and public types.
- `docs/conformance/report.md` is generated conformance evidence.
- The verified `.tgz` file is the release candidate.

Do not edit generated files under `.nuxt/`, `.output/`, `dist/`, or
`release-artifacts/`.

## Commands

Use the Node and pnpm versions declared in `package.json`.

```bash
pnpm install --frozen-lockfile
pnpm dev:prepare
pnpm test
```

Use these focused commands:

- `pnpm lint` checks source and documentation rules.
- `pnpm test:types` checks the module, fixtures, and playground.
- `pnpm test:conformance` runs the conformance suite.
- `pnpm conformance:check` checks the generated conformance report.
- `pnpm oracle:check` checks the pinned React Email oracle.
- `pnpm verify` runs the normal handoff gate.
- `pnpm audit:all` audits the complete workspace dependency graph.
- `pnpm release:verify` builds and tests the installable package.
- `pnpm docs:theme` checks the Nuxt visual tokens and Ginko Docs version.
- `pnpm docs:build` builds the package and then the public documentation.

Run the smallest relevant check while you work. Run lint, types, and tests
before handoff. Run `pnpm release:verify` for package or release changes.

## Architecture boundaries

- Email templates and rendering stay on the server.
- The client bundle must not contain templates or the renderer.
- Preview data and fixtures must not enter production output.
- Development preview and production rendering use the same rendering core.
- The active Nuxt application owns one template registry.
- Nuxt layers do not merge email templates into that registry.
- The module renders email. It does not send email or own recipients.
- Syntax highlighting remains opt-in and uses a closed language set.

Keep delivery-provider behavior outside this repository.

## Tests and documentation

Add tests for boundaries and failure behavior. Update public documentation when
user-visible behavior changes. Update conformance evidence only through its
generator.

Follow `docs/WRITING.md`. Keep the README focused on evaluation and first use.
Put detailed guidance in Ginko Docs. Put maintainer operations in
`MAINTAINING.md`.

Do not rewrite legal text, code, API identifiers, quotations, or generated
reports to match the controlled-English profile.

## Publication safety

Agents must not publish packages, approve npm environments, move npm dist-tags,
create release tags, or handle publication credentials. Agents can prepare and
verify an exact release artifact.

Use a short branch name that describes the work, such as
`fix/preview-isolation`. Do not require an agent or tool prefix such as
`codex/`, `claude/`, or `cursor/`.

Prefer deletion and simplification. Use a hard cut for unreleased paths after
the replacement passes its tests.
