# ADR 0002: keep domain boundaries inside one package

## Status

Accepted.

## Context

Nuxt Email ships as one module, but its build-time registry, renderer, email components, Tailwind processor, and development preview change for different reasons. Letting those areas deep-import each other's implementation files would make a local change require repository-wide knowledge.

## Decision

Keep one package with narrow public facades:

- the package root for Nuxt module setup
- `src/runtime/define-email.ts` for template authors
- `src/runtime/testing/index.ts` for test helpers
- `src/runtime/errors.ts` for errors consumers may handle
- auto-registered `E*` components for email markup

Treat `src/template-registry`, `src/runtime/template-registry`, `src/runtime/render`, `src/runtime/components`, `src/runtime/tailwind`, `src/runtime/dev-preview`, and the build/runtime halves at `src/code-block` and `src/runtime/code-block` as private verticals. A vertical may expose an intentional entry point, but other verticals must not reach through it to internal helpers.

Dependencies flow toward domain capabilities:

- module setup is the composition root and wires build-time and runtime entry points
- rendering composes registered templates and Tailwind post-processing
- components may use Tailwind's nested-style integration; only `ETailwind` creates an engine
- the Tailwind engine stays independent of components, rendering, registries, and preview delivery
- development preview uses the generated `#nuxt-email/registry` facade, not renderer or component internals
- build-time registry code may generate runtime imports; runtime code does not import discovery or generation code

Package exports, focused `no-restricted-imports` rules, and production-boundary tests enforce the boundaries that currently carry the most risk.

## Consequences

No package split is warranted while these areas version and ship as one unit. `CODEOWNERS` would imply stable team ownership that the repository does not yet demonstrate. A component path map would add a second source of truth while the current name-to-file convention remains sufficient; introduce one only if components move across verticals.

Add stronger machinery only when a concrete ownership, release, or navigation problem exceeds these lightweight checks.
