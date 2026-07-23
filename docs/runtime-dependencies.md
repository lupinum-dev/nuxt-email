# Runtime dependency and license review

This record covers the eight direct runtime dependencies of the current `@lupinum/nuxt-email` candidate as reviewed on 2026-07-23. Versions are the exact packages exercised by the lockfile, release verifier, and fresh-install fixture. License values were checked from the installed package manifests; the packed tarball is separately required to preserve Nuxt Email's `LICENSE` and `THIRD_PARTY_NOTICES` byte-for-byte.

| Package | Tested version | Relationship | Purpose | License |
| --- | ---: | --- | --- | --- |
| `@nuxt/kit` | `4.4.8` | Direct dependency | Module setup, generated templates, components, handlers, and Nitro hooks. | MIT |
| `@vitejs/plugin-vue` | `6.0.8` | Direct dependency | Compiles discovered Vue email SFCs in the Nitro build. It does not run while rendering an email. | MIT |
| `css-tree` | `3.2.1` | Direct dependency | Parses and serializes the CSS emitted for Tailwind utility inlining and non-inlinable head rules. | MIT |
| `h3` | `1.15.11` | Direct dependency | Implements the development-only preview handlers shipped by the package. | MIT |
| `html-to-text` | `9.0.5` | Direct dependency | Converts the final rendered HTML into the deterministic plain-text fallback. | MIT |
| `htmlparser2` | `10.1.0` | Direct dependency | Walks marker-scoped Tailwind output and decodes Markdown URL attributes before scheme validation. | MIT |
| `marked` | `15.0.12` | Direct dependency | Parses `EMarkdown` source before it is emitted with email-safe inline styles. | MIT |
| `tailwindcss` | `4.1.18` | Direct dependency | Compiles Tailwind v4 utilities used inside `ETailwind`; compatible declarations are inlined and residual rules are emitted to the head. | MIT |

Nuxt `^4.4.8` and Vue `^3.5.35` are peer dependencies rather than hidden runtime copies. Nuxt `4.4.8` with Vue `3.5.40` is the verified baseline. The release verifier also gates on the current Nuxt release; its Nuxt `4.5.0` run is currently blocked before this module loads by the upstream Vite builder's undeclared `unplugin` import.

`html-to-text` parses only HTML produced by the trusted application template after normal Vue escaping. `htmlparser2` also decodes character references in `EMarkdown` link and image destinations so obfuscated unsafe schemes are rejected before output. Neither dependency is used as a general sanitizer, and neither fetches remote resources. The Vite plugin is installed because the server build compiles application-owned `.vue` templates; no compiler or alternate renderer is exposed as a public API.

React Email is a development-only conformance oracle, not a runtime dependency. The selected algorithms and markup strategies adapted under its MIT license are identified in [provenance](./conformance/provenance.md), and the authoritative notice is shipped in `THIRD_PARTY_NOTICES`.

## Update policy

For every direct dependency or peer-range update:

1. Review the package changelog, license, published files, and relevant security advisories.
2. Re-run lint, types, the full unit/component/module suite, production bundle assertions, and the two isolated fresh-install runs.
3. Re-run oracle and conformance reproducibility when rendering, Vue SSR, or plain-text behavior can change.
4. Inspect the exact tarball and update this table only after the tested lockfile changes.

Do not widen Node, Nuxt, or Vue support ranges without adding the corresponding release-matrix evidence. Do not add a second parser, renderer, cache, or compatibility path to work around an update; fix or replace the existing dependency path directly.
