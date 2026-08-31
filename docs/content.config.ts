import { defineGinkoDocsConfig } from '@lupinum/ginko-docs/content'

export default defineGinkoDocsConfig({
  site: {
    name: 'Nuxt Email',
    description:
      'Typed transactional email for Nuxt, with email-safe Tailwind v4.',
    whenToUse:
      'Use this site to author and render transactional email with Nuxt Email.',
  },
  locales: ['en'],
  blog: false,
})
