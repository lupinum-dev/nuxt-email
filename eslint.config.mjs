// @ts-check
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

// ESLint keeps only the last matching `no-restricted-imports` options for a file, so each
// folder rule repeats the patterns of the wider rules before it.
const tailwindCssInternals = {
  regex: '(?:^|/)tailwind/css(?:/|$)',
  message: 'Tailwind CSS transforms are private to the Tailwind engine.',
}
const compiler = {
  regex: '^(?:\\.\\./)+compiler(?:/|$)',
  message: 'Runtime code must not import the build-time compiler; production renders stay free of Tailwind, Lightning CSS and css-tree.',
}

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
  // Keep the shared, independently tested OSS helpers verbatim.
  ignores: ['scripts/release.mjs', 'scripts/lint-changesets.mjs', 'scripts/audit-deps.mjs', 'scripts/agent-docs.mjs'],
}).append({
  name: 'nuxt-email/no-tailwind-css-internals-outside-tailwind',
  files: ['src/**/*.ts'],
  ignores: ['src/compiler/tailwind/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [tailwindCssInternals] }],
  },
}).append({
  name: 'nuxt-email/runtime-compiler-boundary',
  files: ['src/runtime/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', { patterns: [tailwindCssInternals, compiler] }],
  },
}).append({
  name: 'nuxt-email/tailwind-engine-boundary',
  files: ['src/compiler/tailwind/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        regex: '^(?:\\.\\./)+(?:runtime|template-registry|build|code-block)(?:/|$)',
        message: 'The Tailwind engine must remain independent of the renderer and module code.',
      }],
    }],
  },
}).append({
  name: 'nuxt-email/dev-preview-boundary',
  files: ['src/runtime/dev-preview/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [tailwindCssInternals, compiler, {
        regex: '^(?:\\.\\./)+(?:components|render)(?:/|$)',
        message: 'Development preview must use the generated registry instead of renderer internals.',
      }],
    }],
  },
})
