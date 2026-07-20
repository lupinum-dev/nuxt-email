import { defineGinkoDocsConfig } from '@lupinum/ginko-docs/content'

export default defineGinkoDocsConfig({
  site: {
    name: 'Nuxt Email',
    description:
      'Typed Vue email authoring and deterministic server-side rendering for Nuxt.',
    url: 'https://nuxt-email.lupinum.com',
  },
  locales: ['en'],
  defaultLocale: 'en',
  blog: false,
})
