# Changelog

## 0.1.0 — release candidate

Status: not approved for publication. `nuxt-email` is the working package name; registry ownership and publish access, exact-artifact isolated-install verification, manual email-client QA, and external beta evidence remain release blockers.

### Added

- Ordinary Vue SFC email authoring under recursive `app/emails/` discovery.
- Fourteen auto-registered primitives: `EHtml`, `EHead`, `EBody`, `EPreview`, `EContainer`, `ESection`, `ERow`, `EColumn`, `EHeading`, `EText`, `ELink`, `EImg`, `EHr`, and the Outlook-safe `EButton`.
- Deterministic complete-document HTML rendering and plain-text fallback generation.
- A generated Nitro-only `renderEmail(name, props)` API with typed template names and Vue props.
- One canonical server registry shared by runtime rendering and development preview.
- Exact sibling `.fixtures.ts` preview data and a development-only `/__email` application with sandboxed preview, HTML, plain text, errors, and automatic refresh.
- Actionable unknown-template, duplicate-template, discovery, document, prop, and render errors with preserved causes where applicable.
- React Email `6.9.0` and `@react-email/render` `2.1.0` behavioral oracle, generated conformance report, deterministic renderer measurements, production boundary tests, package inspection, and an isolated fresh-install verification workflow.
- MIT project license, third-party notices, provenance record, email-client QA checklist, and external beta record.

### Security and production boundaries

- Vue interpolation and attributes remain escaped by default.
- The component set has no raw-HTML primitive and rejects content-replacement and event-handler attributes.
- The canonical generated rendering path excludes the renderer and templates from application client bundles.
- The canonical discovery path excludes preview UI, preview endpoints, and fixture modules from production builds.
- The preview iframe is sandboxed and raw preview output uses a restrictive content security policy.
- No public render endpoint or send endpoint is generated for production.

### Intentional scope

- Supported behavior is reported per case in the generated [conformance report](./docs/conformance/report.md); this release does not claim full React Email compatibility.
- Tailwind, Markdown, font loading, code components, JSX, React streaming, edge runtimes, provider adapters, subject/template metadata, configuration options, raw HTML, and a public registry protocol are not part of v0.1.
- Sending remains application-owned: callers pass `{ html, text }` to their selected provider SDK.

### Supported environment

- Node.js `^22.12.0 || ^24.11.0`.
- Nuxt `^4.4.8`.
- Vue `^3.5.0`.

See the [release-candidate record](https://github.com/Mat4m0/nuxt-email/blob/main/docs/release/v0.1-release-candidate.md) for verification evidence and the remaining approval gates.
