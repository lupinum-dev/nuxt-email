// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default createConfigForNuxt({
  features: {
    // Rules for module authors
    tooling: true,
    // Rules for formatting
    stylistic: true,
  },
  dirs: {
    src: [
      './playground',
    ],
  },
}).append({
  // Vendored verbatim from the installed `prismjs` package by
  // scripts/vendor-prism.ts (byte-for-byte, so it stays reproducible). It is
  // generated executable grammar source, not hand-authored, and reformatting it
  // to the repo style would break the byte-for-byte guard.
  ignores: ['src/runtime/components/code-block-prism.ts'],
})
