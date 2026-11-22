# React Email provenance and license policy

Nuxt Email is an independent Vue and Nuxt implementation. Some components and the Tailwind engine adapt algorithms from React Email under its MIT license. This document records that provenance and the release-license obligations. The golden files in `test/render/golden/` pin the rendered output. They replaced the React Email comparison suite when Tailwind moved to build time (ADR 0003); there is no generated conformance report any more.

## Pinned upstream

| Field | Value |
| --- | --- |
| Repository | `resend/react-email` |
| Package | `react-email` `6.9.0` |
| Renderer | `@react-email/render` `2.1.0` |
| React / React DOM | `19.2.7` / `19.2.7` |
| Source commit | `6eb428924c4c2774228a07cbec1977ad8898f143` |
| Published package commit | `71656573fa24b09e48173ae2357bf712fcb401b6` |
| Upstream license | MIT |
| Upstream notice at the pinned commit | Copyright 2024 Plus Five Five, Inc |

The source commit identifies the code the adapted implementations come from. React Email is not a dependency and is not checked out in CI.

## Closely translated behavior

These local implementations are close enough to nontrivial upstream algorithms or markup strategies that their provenance must remain visible even though they were adapted to Vue and hardened locally.

| Local implementation | Pinned React Email source | Relationship |
| --- | --- | --- |
| `src/runtime/components/EButton.ts`, `EButton.padding.ts` | `packages/react-email/src/components/button/button.tsx`, `utils/parse-padding.ts`, `utils/px-to-pt.ts` | Outlook/MSO spacer calculation, padding expansion, unit conversion, point conversion, and compatibility fragments are adapted from the MIT implementation. Local validation and bounded spacer generation are deliberate hardening. |
| `src/runtime/components/EText.ts`, `EText.margins.ts` | `packages/react-email/src/components/text/text.tsx`, `utils/compute-margins.ts` | Ordered CSS margin expansion and default-margin placement are closely translated into Vue-style helpers. |
| `src/runtime/components/EContainer.ts`, `ESection.ts`, `table-padding.ts` | `packages/react-email/src/components/container/container.tsx`, `section/section.tsx` | Moving padding from the presentation table to its cell follows the upstream compatibility implementation. Moving responsive padding classes to the same cell is local code. |
| `src/runtime/components/EEmail.ts` (preview text) | `packages/react-email/src/components/preview/preview.tsx` | The 200-code-unit limit, hidden preview structure, and filler character sequence derive from upstream. Vue-safe hiding and the surrogate boundary intentionally diverge: a character cut at the limit is dropped instead of split. |
| `src/runtime/components/EFont.ts` | `packages/react-email/src/components/font/font.tsx` | The `@font-face` template, the global `* { font-family }` rule, and the `mso-font-alt` fallback selection are reproduced from upstream, including exact template-literal whitespace. |
| `src/runtime/components/ECodeInline.ts` | `packages/react-email/src/components/code-inline/code-inline.tsx` | The Orange.fr webmail compatibility `<style>`, the visible `<code>` plus hidden copy `<span>` structure, and the class-merge order are closely translated. |
| `src/runtime/components/EMarkdown.ts`, `markdown/*` | `packages/react-email/src/components/markdown/{markdown.tsx,styles.ts,utils}` | The `marked` custom `Renderer`, the default per-element style map, and the css-in-js-to-inline serializer are closely translated. The container omits React Email's `data-id` marker. |
| `src/compiler/tailwind/**`, `src/compiler/css-tree.ts` | `packages/react-email/src/components/tailwind/**` | Utility inlining, non-inlinable rule extraction to `<head>`, residual class sanitization, `oklch()` conversion and `calc()` evaluation follow the upstream algorithms. They run at build time. Tailwind's own stylesheets are read from the installed `tailwindcss` package with its theme inlined, and `css-tree` parses them. `var()` resolution and the `rem` to `px` conversion are local code. Nesting removal, hex and `rgba()` color syntax and media range conversion come from the `lightningcss` dependency (MPL-2.0), which replaced the adapted downleveling and color code. |

Other supported primitives were reimplemented from public HTML behavior. Plain-text conversion calls the declared `html-to-text` runtime dependency; it does not copy React Email's renderer source.

## Release obligations

Before publishing a tarball:

- Ship Nuxt Email's own license and the complete authoritative React Email MIT copyright and permission notice in the package. A source comment or this provenance table is not a substitute for the license notice.
- Preserve the table above and the provenance comments in the source when implementations move.
- Inspect the packed tarball to prove both the project license and required third-party notice are present.
- Update this document when newly adapted code changes the copyright holder, license, source paths, or translated algorithms.
- Review every runtime dependency license separately.
- Do not copy React Email branding, documentation prose, screenshots, or website assets.

The pinned repository license files are authoritative for the notice text. Do not infer the legal notice from historical company names in source comments.
