# Runtime dependency and license review

This record covers the nine direct runtime dependencies of the current `@lupinum/nuxt-email` candidate and the four optional Shiki peer dependencies. The table was last updated on 2026-11-22 from the installed lockfile versions. License values were checked from the installed package manifests; the packed tarball is separately required to preserve Nuxt Email's `LICENSE` and `THIRD_PARTY_NOTICES` byte-for-byte.

Build time means the Nuxt build, `@lupinum/nuxt-email/build`, or `createTestRenderer`. The last column says whether a production render loads the package.

| Package | Tested version | Purpose | Production render | License |
| --- | ---: | --- | --- | --- |
| `@nuxt/kit` | `4.6.4` | Module setup, generated templates, components, handlers, and Nitro hooks. | No, build time | MIT |
| `esbuild` | `0.28.1` | Bundles the email registry and every template it imports, in the Nuxt build, `@lupinum/nuxt-email/build` and `createTestRenderer`. | No, build time | MIT |
| `tailwindcss` | `4.3.3` | Compiles the Tailwind v4 classes read from the files the registry build imports. Its own stylesheets are read from the installed package. | No, build time | MIT |
| `lightningcss` | `1.33.0` | Un-nests the Tailwind output, writes colors as hex or `rgba()` and converts media range syntax. Installs a native binary for the platform. | No, build time | MPL-2.0 |
| `css-tree` | `3.2.1` | Parses and serializes the CSS for the owned conversion steps and splits inline declarations from head rules. | No, build time | MIT |
| `h3` | `1.15.11` | Implements the development-only preview handlers shipped by the package. | No, development only | MIT |
| `html-to-text` | `9.0.5` | Converts the final rendered HTML into the deterministic plain-text fallback. | Yes, every render | MIT |
| `marked` | `15.0.12` | Parses `EMarkdown` source before it is emitted with email-safe inline styles. | Yes, bundled with `EMarkdown` | MIT |
| `htmlparser2` | `10.1.0` | Decodes Markdown URL attributes before scheme validation. | Yes, bundled with `EMarkdown` | MIT |
| `@shikijs/core` | `4.4.3` | Tokenizes opt-in `ECodeBlock` source with the configured TextMate grammars and theme. | Only when `codeBlock` is configured; optional peer dependency | MIT |
| `@shikijs/engine-javascript` | `4.4.3` | Runs Shiki grammars without a WASM payload. | Only when `codeBlock` is configured; optional peer dependency | MIT |
| `@shikijs/langs` | `4.4.3` | Supplies individually importable language grammars; generated code imports only configured language modules. | Only when `codeBlock` is configured; optional peer dependency | MIT |
| `@shikijs/themes` | `4.4.3` | Supplies the one configured theme as concrete inline token colors. | Only when `codeBlock` is configured; optional peer dependency | MIT |

`lightningcss` is the only dependency under MPL-2.0. The package uses it unmodified at build time and does not copy its files into the rendered output or the production server bundle.

Nuxt `>=4.5.1 <5` and Vue `^3.5.40` are peer dependencies rather than hidden runtime copies. Release consumers verify the declared minimum and current compatible versions without a dependency shim.

`html-to-text` parses only HTML produced by the trusted application template after normal Vue escaping. `htmlparser2` also decodes character references in `EMarkdown` link and image destinations so obfuscated unsafe schemes are rejected before output. Neither dependency is used as a general sanitizer, and neither fetches remote resources. The SFC compiler comes from the `vue` peer dependency. The build uses it to compile application-owned `.vue` templates; no compiler or alternate renderer is exposed as a public API.

The Shiki packages are optional peer dependencies: an application installs them when it sets `codeBlock`, and the package installs none of them. They are not loaded during disabled module setup and become reachable from a production server bundle only when `codeBlock` is configured. As peers they are outside the CI audit of the package's production dependencies; Renovate still updates the development pins, and the peer range starts at the tested version. The generated component imports the JavaScript regex engine, one theme, and the configured language entrypoints plus their required transitive grammars; it does not import Shiki's full or web registry. Its highlighter is initialized and cached only when a code block is first rendered.

React Email is not a dependency. The selected algorithms and markup strategies adapted under its MIT license are identified in [provenance](./provenance.md), and the authoritative notice is shipped in `THIRD_PARTY_NOTICES`.

## Update policy

For every direct dependency or peer-range update:

1. Review the package changelog, license, published files, and relevant security advisories.
2. Re-run lint, types, the full unit/component/module suite, production bundle assertions, and the two isolated fresh-install runs.
3. Review golden-file changes when rendering, Vue SSR, Tailwind, or plain-text behavior can change. A golden file changes only for an intended output change.
4. Inspect the exact tarball and update this table only after the tested lockfile changes.

Do not widen Node, Nuxt, or Vue support ranges without adding the corresponding release-matrix evidence. Do not add a second parser, renderer, cache, or compatibility path to work around an update; fix or replace the existing dependency path directly.
