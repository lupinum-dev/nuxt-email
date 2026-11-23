---
'@lupinum/nuxt-email': patch
---

Fix the type declarations of `@lupinum/nuxt-email/render` for TypeScript projects that use Node module resolution and check library types.

One declaration had a relative import without the `.js` extension, which gave the error TS2835.
