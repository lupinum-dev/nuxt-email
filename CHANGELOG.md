# Changelog

## 0.1.0 — release candidate

Status: not approved for publication. The unscoped npm name `nuxt-email` is already owned by an unrelated package, so a scoped name (for example `@lupinum/nuxt-email`) is the likely publish name; final registry name, ownership, and publish access remain a maintainer decision. Manual email-client QA and external beta evidence also remain release blockers.

### Added

- Ordinary Vue SFC email authoring under recursive `app/emails/` discovery.
- Nineteen auto-registered components: the document and layout primitives `EHtml`, `EHead`, `EBody`, `EContainer`, `ESection`, `ERow`, `EColumn`, `EHr`; the content primitives `EHeading`, `EText`, `ELink`, `EImg`, the Outlook-safe `EButton`, and the hidden `EPreview` preheader; the typography and code components `EFont`, `ECodeInline`, and `ECodeBlock` (Prism syntax highlighting); and the authoring helpers `EMarkdown` and `ETailwind`.
- `ETailwind` render-time class inlining, including utilities emitted inside nested components, with non-inlinable rules downleveled and injected into a `<head>` `<style>`.
- `EMarkdown` conversion of Markdown source to email-safe HTML with react-dom-compatible inline styles.
- Optional `defineEmail({ subject })` server-side auto-import that computes a subject line from a template's typed props; the subject is returned as `subject` on the render result and shown in the preview.
- Deterministic complete-document HTML rendering and plain-text fallback generation.
- A generated Nitro-only `renderEmail(name, props)` API with typed template names and Vue props, returning `{ html, text, subject? }`.
- One canonical server registry shared by runtime rendering and development preview.
- First-class testing utilities on the `nuxt-email/testing` subpath: `renderEmailComponent`, `normalizeEmailHtml`, and the `RenderedEmail` type, with one shared normalizer implementation used by both consumers and the internal conformance suite.
- Exact sibling `.fixtures.ts` preview data and a development-only `/__email` application with a sandboxed preview, HTML, plain-text, copy/open actions, and automatic refresh.
- Preview enhancements: a computed subject bar, a 600px/375px/full viewport toggle, a dark-client simulation, and a Gmail clipping-budget badge reporting the exact UTF-8 byte size.
- An email-client proof kit (`proofs:generate`, `proofs:send`) that renders a representative batch to `.html`, `.txt`, and valid `multipart/alternative` `.eml` messages with an optional Resend send path, plus a client QA checklist.
- Actionable unknown-template, duplicate-template, discovery, document, prop, and render errors with preserved causes where applicable.
- React Email `6.9.0` and `@react-email/render` `2.1.0` behavioral oracle, generated conformance report, deterministic renderer measurements, production boundary tests, package inspection, and an isolated fresh-install verification workflow.
- A cross-platform CI matrix (Linux, macOS, Windows on Node `22.12.0` and `24.x`) running lint, type checks, and the full test suite, with the runtime-heavy oracle, conformance, and package/fresh-install checks run once on Linux, and an optional documentation-site build job.
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
- Provider adapters, send endpoints, JSX, React streaming, edge runtimes, raw HTML, configuration options, and a public registry protocol are not part of v0.1.
- Sending remains application-owned: callers pass `{ html, text, subject? }` to their selected provider SDK.

### Supported environment

- Node.js `^22.12.0 || ^24.11.0`.
- Nuxt `^4.4.8`.
- Vue `^3.5.0`.

See the [release-candidate record](https://github.com/Mat4m0/nuxt-email/blob/main/docs/release/v0.1-release-candidate.md) for verification evidence and the remaining approval gates.
