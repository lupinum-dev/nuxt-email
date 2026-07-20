import type { NuxtConfig } from 'nuxt/schema'
import NuxtEmail from 'nuxt-email'

type NuxtEmailOptions = Parameters<typeof NuxtEmail>[0]

const noModuleOptions: NuxtEmailOptions = {}
void noModuleOptions

// @ts-expect-error the packed v0.1 module has no configuration surface
const unsupportedModuleOptions: NuxtEmailOptions = { arbitrary: true }
void unsupportedModuleOptions

export default {
  modules: [NuxtEmail],
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
} satisfies NuxtConfig
