import type { Resolver } from '@nuxt/kit'
import { addTemplate } from '@nuxt/kit'
import { generateCodeBlockComponent } from './generate-component'
import type { CodeBlockOptions } from './options'
import { normalizeCodeBlockOptions } from './options'

interface CodeBlockSetup {
  /** Generated module that exports `ECodeBlock`. */
  componentPath: string
}

export function setupCodeBlock(options: CodeBlockOptions, resolver: Resolver): CodeBlockSetup {
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

  return { componentPath: componentTemplate.dst }
}
