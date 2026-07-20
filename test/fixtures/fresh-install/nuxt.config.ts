import type { NuxtConfig } from 'nuxt/schema'
import NuxtEmail from 'nuxt-email'

export default {
  modules: [NuxtEmail],
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
} satisfies NuxtConfig
