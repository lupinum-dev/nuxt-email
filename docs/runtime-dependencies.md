# Runtime dependency and license review

This record covers Nuxt Email `0.1.0` as reviewed on 2026-07-20. Versions are the exact packages exercised by the lockfile, release verifier, and fresh-install fixture. License values were checked from the installed package manifests; the packed tarball is separately required to preserve Nuxt Email's `LICENSE` and `THIRD_PARTY_NOTICES` byte-for-byte.

| Package | Tested version | Relationship | Purpose | License |
| --- | ---: | --- | --- | --- |
| `@nuxt/kit` | `4.4.8` | Direct dependency | Module setup, generated templates, components, handlers, and Nitro hooks. | MIT |
| `@vitejs/plugin-vue` | `6.0.8` | Direct dependency | Compiles discovered Vue email SFCs in the Nitro build. It does not run while rendering an email. | MIT |
| `h3` | `1.15.8` | Direct dependency | Implements the development-only preview handlers shipped by the package. | MIT |
| `html-to-text` | `9.0.5` | Direct dependency | Converts the final rendered HTML into the deterministic plain-text fallback. | MIT |
| `nuxt` | `4.4.8` | Peer dependency and release fixture | Hosts module setup, generated types, Nitro rendering, and development preview. | MIT |
| `vue` | `3.5.40` | Peer dependency and release fixture | Provides Vue SFC authoring and isolated server-side rendering. | MIT |

`html-to-text` parses only the HTML produced by the trusted application template after normal Vue escaping. Nuxt Email does not use it as a sanitizer and does not fetch remote resources during conversion. The Vite plugin is installed because the server build compiles application-owned `.vue` templates; no compiler or alternate renderer is exposed as a public API.

React Email is a development-only conformance oracle, not a runtime dependency. The selected algorithms and markup strategies adapted under its MIT license are identified in [provenance](./conformance/provenance.md), and the authoritative notice is shipped in `THIRD_PARTY_NOTICES`.

## Update policy

For every direct dependency or peer-range update:

1. Review the package changelog, license, published files, and relevant security advisories.
2. Re-run lint, types, the full unit/component/module suite, production bundle assertions, and the two isolated fresh-install runs.
3. Re-run oracle and conformance reproducibility when rendering, Vue SSR, or plain-text behavior can change.
4. Inspect the exact tarball and update this table only after the tested lockfile changes.

Do not widen Node, Nuxt, or Vue support ranges without adding the corresponding release-matrix evidence. Do not add a second parser, renderer, cache, or compatibility path to work around an update; fix or replace the existing dependency path directly.
