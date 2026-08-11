import NuxtEmail from '../../../src/module'

export default defineNuxtConfig({
  modules: [NuxtEmail],
  devtools: { enabled: false },
  app: {
    baseURL: '/sub/',
  },
  compatibilityDate: '2025-07-15',
})
