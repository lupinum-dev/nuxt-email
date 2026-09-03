# Changelog

## v1.0.0-beta.2

### Added

- Added `@lupinum/nuxt-email/build` to compile the existing typed email
  registry for Node runtimes outside Nitro.
- Added `@lupinum/nuxt-email/render` so compiled templates reuse the same
  deterministic renderer, metadata, plain-text generation, and email-safe
  components as Nuxt applications.

### Production boundaries

- Keep delivery, retries, idempotency, provider credentials, and audit state
  application-owned. The package compiles and renders email; it does not send.
- Reject source directories outside the application root, refuse to replace
  output not owned by Nuxt Email, and preserve the last valid registry when a
  build fails.
- Exclude preview fixtures and source templates from the generated production
  registry.

## v1.0.0-beta.1

Status: published on npm's `next` tag. Feature development is frozen until stable `1.0.0`. The three-client beta smoke test passed; the full eight-client checklist and external transactional beta remain pending.

### Added

- Added synchronous `subject` and authored plain-text `text` metadata to `defineEmail`, including prop-derived functions. Authored text takes precedence over automatic HTML-to-text derivation.
- Added the type-only `EmailComponentProps<Component>` helper for deterministic, component-checked preview fixtures.
- Added a baseURL-aware Nuxt DevTools shortcut to the existing development-only `/__email` preview.
- Added direct Resend and local Nodemailer/Mailpit sending recipes while keeping all delivery behavior application-owned.

### Changed

- Rebuilt Tailwind v4 nested-selector and nested `@media`/`@supports` handling so declarations and rules preserve source order, media ranges are downleveled, and unhandled nesting fails instead of emitting raw `&` CSS.
- Limited emitted keyframes to animations referenced by the current render. Animation remains best-effort progressive enhancement because email-client support is limited.
- Made `EHtml.lang` a required, non-empty value. `dir` still defaults to `ltr`.
- Made `ELink` visually neutral by removing its built-in color and underline. `target="_blank"` remains the default and can be overridden.
- Renamed `EmailRenderError.componentName` to `templateName` and kept the original error as `cause`.
- Limited module-driven registry rebuilds to structural template and fixture changes; ordinary edits continue through Nitro's normal watcher.

### Breaking changes from v0.1.1

- Every `EHtml` now requires an explicit non-empty `lang`.
- `ELink` no longer supplies color or text-decoration styles. Add those styles explicitly where required.
- Read `EmailRenderError.templateName` instead of `componentName`; there is no compatibility alias.
- `defineEmail` rejects an empty object and invalid or asynchronous metadata values. Provide at least one synchronous `subject` or `text` value.

## v0.1.1

[Compare changes](https://github.com/lupinum-dev/nuxt-email/compare/e45025a...v0.1.1)

### Changed

- Isolated the package-preview watcher test from the normal unit-test process. This change prevents an open watcher from delaying test completion. ([#9](https://github.com/lupinum-dev/nuxt-email/pull/9))

### Release reliability

- Added exact-byte recovery for a first package version that was published from a certified artifact before npm trusted publishing was available. The workflow rejects different package bytes and requires explicit bootstrap authorization. ([#8](https://github.com/lupinum-dev/nuxt-email/pull/8), [#10](https://github.com/lupinum-dev/nuxt-email/pull/10), [#11](https://github.com/lupinum-dev/nuxt-email/pull/11))
- Made package previews reliable after a cold start on Windows. ([#12](https://github.com/lupinum-dev/nuxt-email/pull/12))
- Corrected missing-tag handling and artifact checksum verification in the protected release workflow. ([#13](https://github.com/lupinum-dev/nuxt-email/pull/13), [#14](https://github.com/lupinum-dev/nuxt-email/pull/14))

### Compatibility

- The runtime files are unchanged from `0.1.0`. This patch aligns the published package metadata with the current certified source and establishes the normal trusted-publishing path for later releases.

## v0.1.0

Status: pre-1.0 candidate. The package identity is `@lupinum/nuxt-email`; the unscoped npm package is unrelated. Manual email-client QA and external beta evidence remain release gates.

### Added

- Ordinary Vue SFC email authoring under recursive `app/emails/` discovery.
- Eighteen built-in auto-registered components: the document and layout primitives `EHtml`, `EHead`, `EBody`, `EContainer`, `ESection`, `ERow`, `EColumn`, `EHr`; the content primitives `EHeading`, `EText`, `ELink`, `EImg`, the Outlook-safe `EButton`, and the hidden `EPreview` preheader; plus `EFont`, `ECodeInline`, `EMarkdown`, and `ETailwind`.
- Opt-in `ECodeBlock` syntax highlighting with one configured Shiki theme, a closed language allowlist, inline token colors, email-safe wrapping, optional line numbers, and a Nuxt-config-aware `#nuxt-email/testing` binding.
- Email-safe Tailwind v4 through `ETailwind`: render-time class inlining, including utilities emitted inside nested components, with non-inlinable rules downleveled and injected into a `<head>` `<style>`.
- `EMarkdown` conversion of Markdown source to email-safe HTML with react-dom-compatible inline styles, raw-HTML rejection, safe URL-scheme validation, and escaped code content.
- Optional `defineEmail({ subject: () => string })`, imported from `@lupinum/nuxt-email/define-email`, that captures the template's real props in a closure; the subject is returned as `subject` on the render result and shown in the preview.
- Deterministic complete-document HTML rendering and plain-text fallback generation.
- A generated Nitro-only `renderEmail(name, props)` API with typed template names and Vue props, returning `{ html, text, subject? }`.
- One canonical server registry shared by runtime rendering and development preview.
- First-class testing utilities on the `@lupinum/nuxt-email/testing` subpath: `renderEmailComponent`, `EmailRenderError`, and the `RenderedEmail` type.
- Stable focused entry points for `@lupinum/nuxt-email/define-email` and `@lupinum/nuxt-email/errors`.
- Exact sibling `.fixtures.ts` preview data and a development-only `/__email` application with a sandboxed preview, HTML, plain-text, copy/open actions, and automatic refresh.
- Preview enhancements: a computed subject bar, a 600px/375px/full viewport toggle, and an exact UTF-8 byte-size badge with an approximate Gmail clipping-budget warning.
- An email-client proof kit (`proofs:generate`, `proofs:send`) that renders a representative batch to `.html`, `.txt`, and valid `multipart/alternative` `.eml` messages with an optional Resend send path, plus a client QA checklist.
- Actionable unknown-template, duplicate-template, discovery, document, prop, and render errors with preserved causes where applicable.
- React Email `6.9.0` and `@react-email/render` `2.1.0` behavioral oracle, generated conformance report, deterministic renderer measurements, production boundary tests, package inspection, and an isolated fresh-install verification workflow.
- A cross-platform CI matrix (Linux, macOS, Windows on Node 22, 24, and 26) running lint, type checks, and the full test suite, with the runtime-heavy oracle, conformance, and package/fresh-install checks run once on Linux, and a documentation-site build job.
- MIT project license, third-party notices, provenance record, email-client QA checklist, and external beta record.

### Security and production boundaries

- Vue interpolation and attributes remain escaped by default.
- The component set has no raw-HTML primitive and rejects content-replacement and event-handler attributes.
- The canonical generated rendering path excludes the renderer and templates from application client bundles.
- The canonical discovery path excludes preview UI, preview endpoints, and fixture modules from production builds.
- The preview iframe is sandboxed and raw preview output uses a restrictive content security policy.
- No public render endpoint or send endpoint is generated for production.

### Intentional scope

- Supported behavior is reported per case in the generated [conformance report](https://github.com/lupinum-dev/nuxt-email/blob/main/docs/conformance/report.md); this release does not claim full React Email compatibility.
- Provider adapters, send endpoints, JSX, React streaming, edge runtimes, raw HTML, configurable discovery paths, and a public registry protocol are not part of v1. `codeBlock` is the sole module option.
- Sending remains application-owned: callers pass `{ html, text, subject? }` to their selected provider SDK.

### Supported environment

- Node.js `^22.18.0 || ^24.11.0 || ^26.0.0`.
- Nuxt `>=4.5.1 <5`.
- Vue `^3.5.35`.

The repository's v1.0 readiness gate records the current contract and remaining approval steps; the live release ledger is intentionally excluded from the npm tarball.
