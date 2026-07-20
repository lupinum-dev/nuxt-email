import { defineNuxtModule } from '@nuxt/kit'
import vue from '@vitejs/plugin-vue'

type NitroRollupOptions = {
  nitro?: {
    rollupConfig?: {
      plugins?: unknown
    }
  }
}

export default defineNuxtModule({
  meta: {
    name: 'nuxt-email',
    configKey: 'nuxtEmail',
  },
  setup(_options, nuxt) {
    const nuxtOptions = nuxt.options as typeof nuxt.options & NitroRollupOptions
    const nitro = (nuxtOptions.nitro ??= {})
    nitro.rollupConfig ??= {}
    const existingPlugins = nitro.rollupConfig.plugins
    nitro.rollupConfig.plugins = existingPlugins
      ? [existingPlugins, vue()]
      : [vue()]
  },
})
