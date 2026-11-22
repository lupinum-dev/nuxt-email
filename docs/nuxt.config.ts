export default defineNuxtConfig({
  extends: ['@lupinum/ginko-docs'],
  site: { url: 'https://nuxt-email.lupinum.com' },
  // Pages removed with the EEmail root and build-time Tailwind.
  routeRules: {
    '/docs/components/tailwind': { redirect: { to: '/docs/guides/tailwind', statusCode: 301 } },
    '/docs/reference/define-email': { redirect: { to: '/docs/components/structure', statusCode: 301 } },
    '/docs/reference/conformance': { redirect: { to: '/docs/guides/client-compatibility', statusCode: 301 } },
  },
  ginkoDocs: {
    syntaxHighlighting: {
      themes: {
        light: 'material-theme-lighter',
        dark: 'material-theme-palenight',
      },
    },
  },
  i18n: {
    baseUrl: 'https://nuxt-email.lupinum.com',
    locales: [{ code: 'en', language: 'en-US', name: 'English' }],
  },
})
