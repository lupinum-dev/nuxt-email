# React Email provenance and license policy

Nuxt Email is an independent Vue and Nuxt implementation tested against a pinned React Email behavioral oracle. The generated [conformance report](./report.md) is the source of truth for behavior classifications and upstream source references; this document records source provenance and release-license obligations that do not belong in that generated report.

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

The committed oracle manifest at `test/conformance/oracle/react-email-6.9.0.json` and its SHA-256 in the generated report make this baseline reproducible.

## Closely translated behavior

These local implementations are close enough to nontrivial upstream algorithms or markup strategies that their provenance must remain visible even though they were adapted to Vue and hardened locally.

| Local implementation | Pinned React Email source | Relationship |
| --- | --- | --- |
| `src/runtime/components/EButton.ts`, `button-padding.ts` | `packages/react-email/src/components/button/button.tsx`, `utils/parse-padding.ts`, `utils/px-to-pt.ts` | Outlook/MSO spacer calculation, padding expansion, unit conversion, point conversion, and compatibility fragments are adapted from the MIT implementation. Local validation and bounded spacer generation are deliberate hardening. |
| `src/runtime/components/EText.ts`, `text-margins.ts` | `packages/react-email/src/components/text/text.tsx`, `utils/compute-margins.ts` | Ordered CSS margin expansion and default-margin placement are closely translated into Vue-style helpers. |
| `src/runtime/components/EContainer.ts`, `ESection.ts`, `table-padding.ts` | `packages/react-email/src/components/container/container.tsx`, `section/section.tsx` | Moving padding from the presentation table to its cell follows the upstream compatibility implementation. |
| `src/runtime/components/EPreview.ts` | `packages/react-email/src/components/preview/preview.tsx` | The 200-code-unit limit, hidden preview structure, and filler character sequence derive from upstream. Vue-safe hiding, title handling, and surrogate-boundary behavior intentionally diverge as listed in the conformance report. |

Other supported primitives were reimplemented from public HTML behavior and conformance cases. Plain-text conversion calls the declared `html-to-text` runtime dependency; it does not copy React Email's renderer source.

## Release obligations

Before publishing a tarball:

- Ship Nuxt Email's own license and the complete authoritative React Email MIT copyright and permission notice in the package. A source comment or this provenance table is not a substitute for the license notice.
- Preserve the table above and the per-case upstream paths in the oracle manifest when implementations move.
- Inspect the packed tarball to prove both the project license and required third-party notice are present.
- Re-run `pnpm oracle:check` and `pnpm conformance:check`; an oracle upgrade must update this document if the copyright holder, license, source paths, or translated algorithms change.
- Review every runtime dependency license separately. Development-only oracle dependencies do not become runtime dependencies merely because they are used by conformance generation.
- Do not copy React Email branding, documentation prose, screenshots, or website assets.

The pinned repository license files are authoritative for the notice text. Do not infer the legal notice from historical company names in source comments.
