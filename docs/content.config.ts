import { defineGinkoDocsConfig } from '@lupinum/ginko-docs/content'

export default defineGinkoDocsConfig({
  site: {
    name: 'Nuxt Email',
    description:
      'Typed transactional email for Nuxt, with email-safe Tailwind v4.',
    url: 'https://nuxt-email.lupinum.com',
  },
  locales: ['en'],
  blog: false,
})
