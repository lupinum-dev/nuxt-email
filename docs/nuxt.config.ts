export default defineNuxtConfig({
  extends: ['@lupinum/ginko-docs'],
  site: { url: 'https://nuxt-email.lupinum.com' },
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
