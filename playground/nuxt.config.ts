import NuxtEmail from '@lupinum/nuxt-email'

export default defineNuxtConfig({
  modules: [
    [NuxtEmail, {
      codeBlock: {
        languages: ['typescript'],
        theme: 'github-dark',
      },
    }],
  ],
  compatibilityDate: '2025-07-15',
})
