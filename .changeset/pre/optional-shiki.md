---
"@lupinum/nuxt-email": major
---

Change the Shiki packages to optional peer dependencies, so only applications that use `ECodeBlock` install them.

The package no longer installs `@shikijs/core`, `@shikijs/engine-javascript`, `@shikijs/langs` and `@shikijs/themes`. Syntax highlighting works as before once they are installed. If `codeBlock` is set and they are missing, module setup and `createTestRenderer()` fail with the install instruction.

Migration: if your `nuxt.config.ts` sets `nuxtEmail.codeBlock`, run `pnpm add @shikijs/core @shikijs/engine-javascript @shikijs/langs @shikijs/themes`. Applications without `codeBlock` need no change.
