import type { NuxtConfig } from 'nuxt/schema'

export default {
  modules: ['@lupinum/nuxt-email'],
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
  nuxtEmail: {},
} satisfies NuxtConfig
