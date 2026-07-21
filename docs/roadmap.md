# Nuxt Email future roadmap

This is the canonical backlog for features that may follow `1.0.0`. It is intentionally a decision record, not a promise or release schedule. The current release contract remains defined by the README, component documentation, conformance report, and [`v1.0-readiness.md`](./release/v1.0-readiness.md).

## Product boundary

Nuxt Email is typed transactional email for Nuxt, with email-safe Tailwind v4. A roadmap item belongs here only when it improves the authoring, rendering, testing, or verification of transactional email inside an existing Nuxt application.

Before accepting a feature, require all of the following:

1. A real transactional-Nuxt use case, preferably reported by more than one application.
2. A concrete acceptance criterion and a way to verify it.
3. One canonical source of truth; no parallel template registry, renderer, or CSS pipeline.
4. No production payload for development-only functionality.
5. An invariant or boundary test, not only a happy-path snapshot.
6. A clear explanation of why documentation or an application-owned helper is insufficient.

The default decision is to keep the core small. A useful idea can remain in this document indefinitely without becoming part of the package.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| Candidate | Worth designing after v1 evidence exists. |
| Investigate | Useful in principle, but demand, client behavior, or architecture is unresolved. |
| Recipe first | Solve in documentation before considering package code. |
| Parked | Valid convenience, but not strategically important. |
| Rejected | Conflicts with the product boundary or creates a second system. |

## Release rule

Do not add another renderer feature before `1.0.0`. Until v1 is published, the only permitted product changes are fixes found by the external application beta, real-client Gmail/Apple Mail/Outlook QA, the current Nuxt release gate, or documentation review.

## Priority 1: documentation and evaluation

### Rendered component gallery

**Status:** Candidate

**Why:** Developers should be able to evaluate every primitive without creating a temporary application. A comparable request remains open in adjacent Nuxt email tooling.

The gallery should show, for every public component:

- the actual Vue source;
- the canonical rendered preview;
- relevant generated HTML;
- important client limitations; and
- a link to the complete API reference.

**Acceptance criteria:**

- Examples render through the real Nuxt Email renderer during the docs build.
- No hardcoded HTML facsimiles or second example implementation.
- Gallery failures break the documentation build.
- Examples remain accessible and usable at narrow viewport widths.

### Shared design-token recipe

**Status:** Recipe first

**Why:** Nuxt developers want application colors such as `primary` to stay synchronized with email colors. Automatically importing the browser stylesheet or emitting CSS variables is unreliable in email clients.

Document one canonical TypeScript token module consumed by both the Nuxt application theme and the concrete `ETailwind` theme/config. The generated email must contain resolved values such as `#16794d`, not `var(--color-primary)`.

**Acceptance criteria:**

- One token source feeds both consumers.
- The recipe works in a fresh Nuxt application.
- Changing one token changes both app and email output.
- No additional Nuxt Email configuration or CSS discovery path is introduced.

### Localization recipe

**Status:** Recipe first

**Why:** Transactional email is frequently localized, but first-class `@nuxtjs/i18n` integration would add runtime-config mutation, locale state, and cross-module coupling.

Document application-owned translation resolution before `renderEmail`, passing already-localized strings or an isolated translator through typed props. If a Vue i18n plugin is demonstrated, it must be created per render so concurrent locales cannot leak.

### Comparison and migration guides

**Status:** Candidate

Maintain honest guides for:

- React Email migration;
- `nuxt-email-renderer` comparison and migration;
- Maizzle comparison and boundary selection; and
- plain HTML/MJML migration only if users request it.

The comparison must acknowledge that `nuxt-email-renderer` is a broader Vue Email continuation and that Maizzle has an official Nuxt module. Nuxt Email should be distinguished by generated template/prop types, request-time Nitro rendering, Tailwind v4, stable output, and published verification—not by claiming exclusive Nuxt or Vue support.

## Priority 2: development checks

### Deterministic structural linter

**Status:** Candidate

**Location:** Development preview only

Add a `Checks` representation to `/__email` with small, deterministic rules such as:

- missing or empty image `alt` text;
- missing image width or height;
- insecure `http:` links where `https:` is expected;
- placeholder, empty, or suspicious destinations;
- layout tables missing `role="presentation"` or `role="none"`;
- accidental forms, scripts, event handlers, or unsupported active content;
- duplicate IDs where IDs are present; and
- exact rendered size approaching the configured authoring budget.

**Acceptance criteria:**

- Every rule has focused valid and invalid fixtures.
- Findings include severity, rendered element context, and actionable guidance.
- The linter analyzes canonical rendered HTML and never changes it.
- It adds nothing to the production Nitro output.
- Rules are versioned with the package and do not depend on a network service.

Start with structural checks. Do not combine the first implementation with caniemail data, scoring, or automatic repair.

### Pinned caniemail compatibility checks

**Status:** Investigate

**Dependency:** Structural linter must already be stable.

Analyze emitted HTML/CSS against a reviewed, versioned caniemail dataset. Report support by relevant client family without claiming universal compatibility or a single misleading percentage.

**Acceptance criteria:**

- The dataset version and source date are visible.
- Builds and preview rendering work offline.
- Dataset updates are explicit dependency/review events.
- Findings distinguish unsupported, partial, unknown, and irrelevant behavior.
- Client selection has a conservative default and does not become module configuration.
- No mutable live API is fetched while rendering or previewing.

### Link and image inventory

**Status:** Parked

Show a small QA inventory derived from canonical HTML:

- every destination URL;
- every image source, alt value, and explicit dimensions;
- total link and image counts; and
- obvious duplicate or insecure resources.

Implement only if it can reuse the structural linter's parsed representation instead of adding another HTML parser or analysis pass.

## Priority 3: real-client handoff

### Download `.eml` from preview

**Status:** Candidate

Expose a development-only download that reuses the proof kit's deterministic `multipart/alternative` generator. This lets developers open the exact HTML/text result in Apple Mail or Outlook without adding credentials or provider dependencies.

**Acceptance criteria:**

- Output uses CRLF, valid MIME boundaries, quoted-printable encoding, HTML, plain text, and subject where defined.
- The preview and CLI proof kit share one generator implementation.
- Repeated downloads for identical input are byte-identical apart from explicitly documented envelope fields.
- No Nodemailer, SMTP client, recipient management, or provider credentials enter the module.

### Named fixture scenarios

**Status:** Investigate

Allow one template to expose several deterministic preview cases, such as success, long-content, empty-optional-fields, and localized variants.

Prefer a small extension to the existing colocated `.fixtures.ts` contract. Do not add a global fixture registry or runtime hook.

**Acceptance criteria:**

- Existing single fixtures remain the simplest path.
- Scenario names and props are type-checked against the template.
- Selection survives refresh where possible.
- Fixtures remain development-only and absent from production output.
- The canonical renderer remains unchanged.

### Device presets and network QR link

**Status:** Parked

Potential conveniences:

- additional named viewport widths;
- custom preview width without module configuration; and
- a QR code for the local network preview URL.

Add only after confirming that developers actually test on physical phones. The QR implementation must not introduce an external service, production dependency, or network telemetry.

### Optional local image workflow

**Status:** Investigate

Possible future work includes documented Vite `?inline` imports, data URIs, or sender-layer CID attachments. Email-client support and message-size costs make this unsuitable as a default.

Prefer hosted HTTPS assets. Keep CID attachment creation in the delivery layer because rendering does not own MIME attachments.

## Priority 4: additive rendering extensions

### Dark-mode image source

**Status:** Investigate

Consider an additive `darkSrc` prop on `EImg` that emits a conservative `<picture>`/media-source pattern only after real-client evidence exists.

**Acceptance criteria:**

- Omitting `darkSrc` preserves the current output byte-for-byte.
- Gmail, Apple Mail, and Outlook behavior is recorded.
- A normal `src` fallback remains mandatory.
- Plain-text behavior is unchanged.
- The feature is documented as best-effort rather than universal dark-mode support.

### Reduced-motion image source

**Status:** Parked

An additive `motionSrc` or reduced-motion source may follow the same policy as `darkSrc`. Require a demonstrated animated-email use case and client evidence first.

### Outlook/VML background helper

**Status:** Investigate

A narrowly scoped background component may be justified if multiple transactional applications need image backgrounds that must work in desktop Outlook.

Do not add a generic VML/raw conditional API. The component would need fixed safe markup, documented constraints, and proof fixtures across supported Outlook versions.

### QR-code component

**Status:** Parked

Useful for tickets, login handoffs, and device pairing, but not a core transactional primitive. Before implementation, decide whether QR generation belongs in application data preparation rather than the renderer. Prefer accepting an application-generated hosted image URL unless inline generation provides a verified benefit.

### Additional email primitives

**Status:** Investigate individually

Do not create a component-count roadmap. A new primitive is justified only when it contains difficult email-client markup or a safety invariant that applications should not reproduce. Ordinary combinations of `EText`, `ESection`, `EColumn`, and other primitives belong in recipes, not the runtime.

## Priority 5: authoring and automation

### Agent authoring skill

**Status:** Candidate after the v1 API freezes

Package concise authoring instructions and references for coding agents:

- component selection and contracts;
- Tailwind v4 rules and limitations;
- typed `defineEmail` subjects;
- preview fixtures;
- testing utilities;
- migration from React Email; and
- common unsafe patterns to reject.

The skill must reference the canonical documentation instead of copying large sections that will drift.

### Template starter examples

**Status:** Candidate

Provide a small set of application-oriented examples—welcome, password reset, receipt, alert, and release notes—without introducing a starter CLI or template marketplace.

Examples should be copyable Vue SFCs, use typed props, pass client QA, and avoid fake framework APIs.

### Preview render memoization

**Status:** Investigate internally

If future preview tabs or checks request the same template/fixture repeatedly, collapse them into one generation-keyed render. Do not add a general production cache. Any development memoization must invalidate deterministically on template, fixture, or relevant configuration changes.

## Maintenance roadmap

These are recurring engineering responsibilities rather than user-facing features.

### React Email oracle upgrades

- Keep the current version pinned until an intentional upgrade branch exists.
- Review upstream behavior changes case by case.
- Regenerate oracle fixtures from the pinned source commit.
- Add, reclassify, or document every behavior before changing the published report.
- Never advertise compatibility with a version that has not passed reproducibility and conformance checks.

### Tailwind upgrades

- Pin the production compiler version.
- Review generated CSS, parser behavior, native dependency changes, and Node engine floors.
- Re-run nested-component, author-precedence, responsive, pseudo, Outlook padding, escaping, performance, and deterministic-render tests.
- Do not maintain parallel Tailwind v3/v4 engines.

### Nuxt and Vue support

- Test the declared floor and current supported Nuxt release in isolated, non-hoisted consumers.
- Expand Nuxt, Vue, Node, edge, or operating-system support only after adding corresponding CI and release-verifier evidence.
- Prefer fixing the existing integration over compatibility shims.

### Performance budgets

Track:

- cold render latency;
- median warm latency;
- repeated-render determinism;
- heap change across sequential renders;
- server bundle size; and
- exact package/tarball contents.

Treat a material regression as a release decision, not an automatically accepted dependency cost.

### Client-proof maintenance

Repeat the representative proof set for changes to layout components, Tailwind output, Markdown, images, buttons, head markup, plain text, or rendering dependencies. Keep browser preview claims separate from real-inbox evidence.

## Explicitly rejected directions

The following are not backlog items unless the product category is deliberately changed:

- provider adapters, provider-neutral sending, SMTP, recipients, queues, or delivery status;
- production render endpoints generated by the module;
- a Maizzle-style CLI, static campaign builder, or marketing workflow;
- a configurable transformer pipeline, Juice, arbitrary CSS post-processing, or URL/UTM rewriting;
- module options for custom email directories, layers precedence, component shadowing, or multiple registries;
- a second renderer, preview server, Tailwind engine, or CSS source of truth;
- automatic ingestion of the Nuxt application stylesheet or browser CSS variables;
- raw HTML primitives, unsafe Markdown HTML, event handlers, or content-replacement attributes;
- first-class mutable i18n runtime integration;
- built-in test sending through React Email or another public endpoint;
- live network dependencies for compatibility, linting, images, or preview behavior;
- universal inbox compatibility scores or pixel-equality claims;
- dark-mode simulation presented as proof of inbox behavior;
- component breadth merely to match Maizzle or another library;
- Nuxt 3, Nuxt 5, edge-runtime, or client-side rendering without a dedicated support contract and evidence matrix; and
- compatibility shims or dual APIs for unreleased/greenfield behavior.

## Proposal template

Use this checklist when promoting an idea from this roadmap:

```md
### Problem

Which real transactional Nuxt workflow is blocked?

### Evidence

Which applications or users requested it? What current workaround exists?

### Simplest alternative considered

Can documentation, typed props, an application helper, or an existing component solve it?

### Product boundary

Why does this belong in rendering/authoring/verification rather than delivery or application code?

### Acceptance criteria

- Observable behavior
- Supported and unsupported cases
- Production/development boundary
- Client evidence, when relevant
- Performance/package impact

### Invariants and tests

Which invalid states become impossible, and which regression tests prove that?

### Removal or replacement

Does this delete or replace an existing path, or create a second source of truth?
```

## Suggested sequence

After `1.0.0`, the default order is:

1. Collect real issue and beta evidence.
2. Ship the rendered component gallery and shared-token/localization recipes.
3. Add the deterministic structural linter.
4. Evaluate pinned caniemail checks.
5. Add `.eml` download and named fixtures if requested.
6. Publish the agent authoring skill after the API has remained stable.
7. Evaluate additive rendering extensions individually from client evidence.

Do not assign dates until an item has an owner, evidence, acceptance criteria, and a release milestone.
