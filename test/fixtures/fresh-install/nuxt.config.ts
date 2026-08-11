import type { NuxtConfig } from 'nuxt/schema'
import NuxtEmail from '@lupinum/nuxt-email'

type NuxtEmailOptions = Parameters<typeof NuxtEmail>[0]

const noModuleOptions: NuxtEmailOptions = {}
void noModuleOptions

const codeBlockModuleOptions = {
  codeBlock: {
    languages: ['typescript'],
    theme: 'github-dark',
  },
} as const satisfies NuxtEmailOptions

// @ts-expect-error unsupported configuration is rejected
const unsupportedModuleOptions: NuxtEmailOptions = { arbitrary: true }
void unsupportedModuleOptions

export default {
  modules: [[NuxtEmail, codeBlockModuleOptions]],
  devtools: { enabled: false },
  compatibilityDate: '2025-07-15',
} satisfies NuxtConfig
