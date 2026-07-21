# ADR 0001: use isolated Vue SSR as the initial email renderer

## Status

Accepted and retained for v1.

## Context

Nuxt Email needs to render ordinary Vue components and SFCs to deterministic server-only HTML. React Email is the behavioral oracle for overlapping email primitives, but React streaming, Suspense, renderer markers, and Next.js preview infrastructure are not product requirements.

The first implementation must prove that the same Vue SFC can render inside Nitro without a browser runtime and that framework-specific serialization differences can be classified without changing production output.

## Decision

Use a fresh `createSSRApp()` instance and Vue's public `renderToString()` API for each render. Register the public `@vitejs/plugin-vue` Rollup-compatible plugin in Nitro so server-only template imports compile through the standard Vue SFC compiler. Assemble the email doctype in one direct document function. Keep conformance normalization in tests only.

The renderer will not use a custom Vue renderer, an email intermediate representation, a shared mutable app instance, or a second compatibility rendering path.

## Consequences

- Vue SFCs, slots, `defineProps()`, `v-if`, and `v-for` work through standard Vue compilation.
- Each render is isolated from application-global mutable state.
- Nitro can compile and render email SFCs through supported Nuxt and Vue behavior.
- Nuxt Email owns the one Nitro Vue-plugin registration required by its generated server imports; applications do not repeat this configuration.
- React and Vue serializer noise is compared through narrow, tested normalization rules.
- Email-client behavior remains implemented by primitives rather than by emulating React internals.
- If Vue SSR later blocks a concrete acceptance criterion, the failing case must be written before reconsidering this decision.

## Rejected alternatives

### Fork React Email

Rejected because it would retain React, React DOM, JSX, and preview-stack coupling while failing to provide a native Vue authoring model.

### Custom Vue renderer or email IR

Rejected because no current acceptance criterion requires it. It would add a second rendering model before the SSR path has demonstrated a limitation.

### Render through the host Nuxt application

Rejected because implicit host plugins and global state would make output harder to reason about and less deterministic. Explicit integrations can be added when a real requirement defines their boundary.
