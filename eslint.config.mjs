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
  name: 'nuxt-email/no-tailwind-css-internals-outside-tailwind',
  files: ['src/**/*.ts'],
  ignores: ['src/runtime/tailwind/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        regex: '(?:^|/)tailwind/engine/css(?:/|$)',
        message: 'Tailwind CSS transforms are private to the Tailwind vertical.',
      }],
    }],
  },
}).append({
  name: 'nuxt-email/tailwind-engine-boundary',
  files: ['src/runtime/tailwind/engine/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        regex: '^(?:\\.\\./)+(?:components|render|dev-preview|template-registry)(?:/|$)',
        message: 'The Tailwind engine must remain independent of runtime integration verticals.',
      }],
    }],
  },
}).append({
  name: 'nuxt-email/dev-preview-boundary',
  files: ['src/runtime/dev-preview/**/*.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        regex: '^(?:\\.\\./)+(?:components|render|tailwind)(?:/|$)',
        message: 'Development preview must use the generated registry instead of renderer internals.',
      }],
    }],
  },
}).append({
  name: 'nuxt-email/component-tailwind-engine-boundary',
  files: ['src/runtime/components/E*.ts'],
  ignores: ['src/runtime/components/ETailwind.ts'],
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [{
        regex: '^(?:\\.\\./)+tailwind/engine(?:/|$)',
        message: 'Only ETailwind may construct or configure the Tailwind engine.',
      }],
    }],
  },
})
