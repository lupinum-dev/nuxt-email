---
'@lupinum/nuxt-email': patch
---

Fix the install command for `typescript` and `vue-tsc` in the error of `@lupinum/nuxt-email/build` and in the guides.

A command without a version installs TypeScript 7, and the build then fails. The command is now `pnpm add -D typescript@~5.9.3 vue-tsc`. The packaged documentation also has corrections: the getting-started guide now includes this install step, and the pages on `EMarkdown` style overrides, `EButton` padding, container queries and the client checks now match the behavior.
