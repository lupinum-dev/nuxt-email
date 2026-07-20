import { defineNuxtModule } from '@nuxt/kit'
import vue from '@vitejs/plugin-vue'

export type { EBodyProps } from './runtime/components/EBody'
export type { EHeadProps } from './runtime/components/EHead'
export type { EHeadingProps, HeadingTag } from './runtime/components/EHeading'
export type { EHrProps } from './runtime/components/EHr'
export type { EHtmlProps } from './runtime/components/EHtml'
export type { EImgProps } from './runtime/components/EImg'
export type { ELinkProps } from './runtime/components/ELink'
export type { ETextProps } from './runtime/components/EText'
export type { RenderedEmail } from './runtime/render/types'
export { EBody, EHead, EHeading, EHr, EHtml, EImg, ELink, EText } from './runtime/components'
export { EmailRenderError } from './runtime/render/errors'
export { renderEmailComponent } from './runtime/render/render-email-component'

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
