import type { Resolver } from '@nuxt/kit'
import { addComponent, addTemplate, addTypeTemplate } from '@nuxt/kit'
import { generateCodeBlockComponent } from './generate-component'
import {
  generateConfiguredRenderer,
  generateConfiguredRendererTypes,
} from './generate-configured-renderer'
import type { CodeBlockOptions } from './options'
import { normalizeCodeBlockOptions } from './options'

export function setupCodeBlock(options: CodeBlockOptions, resolver: Resolver): string {
  const normalizedOptions = normalizeCodeBlockOptions(options)
  const componentTemplate = addTemplate({
    filename: 'nuxt-email/ECodeBlock.ts',
    write: true,
    getContents: async () => generateCodeBlockComponent(normalizedOptions, {
      core: await resolver.resolvePath('@shikijs/core'),
      createCodeBlockComponent: (
        await resolver.resolvePath('./runtime/code-block/create-component')
      ).replace(/\.ts$/, ''),
      engineJavaScript: await resolver.resolvePath('@shikijs/engine-javascript'),
      languages: await Promise.all(normalizedOptions.languages.map((language) => {
        return resolver.resolvePath(`@shikijs/langs/${language}`)
      })),
      theme: await resolver.resolvePath(`@shikijs/themes/${normalizedOptions.theme}`),
    }),
  })

  addComponent({
    name: 'ECodeBlock',
    export: 'ECodeBlock',
    filePath: componentTemplate.dst,
    mode: 'server',
  })

  const configuredRendererPaths = {
    codeBlockComponent: componentTemplate.dst,
    createRenderEmailComponent: resolver.resolve('./runtime/render/render-email-component'),
    emailComponentRegistry: resolver.resolve('./runtime/components/email-component-registry'),
    emailRenderError: resolver.resolve('./runtime/render/errors'),
  }
  const configuredRendererTemplate = addTemplate({
    filename: 'nuxt-email/configured-renderer.js',
    write: true,
    getContents: () => generateConfiguredRenderer(configuredRendererPaths),
  })
  addTypeTemplate({
    filename: 'nuxt-email/configured-renderer.d.ts',
    getContents: () => generateConfiguredRendererTypes(resolver.resolve('./runtime/testing')),
  }, { nitro: true })

  return configuredRendererTemplate.dst
}
