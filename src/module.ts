import { isAbsolute, relative, resolve } from 'node:path'
import {
  addComponent,
  addServerImports,
  addServerHandler,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  updateTemplates,
  useNitro,
} from '@nuxt/kit'
import vue from '@vitejs/plugin-vue'
import type { CodeBlockOptions } from './code-block/options'
import { attachPreviewFixtures } from './dev-preview/fixtures'
import { EMAIL_COMPONENT_NAMES } from './runtime/components/email-component-names'
import { discoverEmailTemplates } from './template-registry/discovery'
import { generateEmailRegistry, generateEmailTypes } from './template-registry/generation'

export type { RenderedEmail } from './runtime/render/types'

type NitroRollupOptions = {
  nitro?: {
    alias?: Record<string, string>
    externals?: {
      inline?: Array<string | RegExp | ((id: string, importer?: string) => boolean | Promise<boolean>)>
    }
    rollupConfig?: {
      plugins?: unknown
    }
    typescript?: {
      tsConfig?: {
        compilerOptions?: {
          paths?: Record<string, string[]>
        }
      }
    }
  }
}

export interface ModuleOptions {
  codeBlock?: CodeBlockOptions
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@lupinum/nuxt-email',
    configKey: 'nuxtEmail',
    compatibility: {
      nuxt: '>=4.4.8 <4.5.0',
    },
  },
  async setup(options, nuxt) {
    const optionNames = Object.keys(options).filter(name => name !== 'codeBlock').sort()
    if (optionNames.length > 0) {
      throw new TypeError(`nuxt-email received unsupported module options: ${optionNames.join(', ')}`)
    }

    const resolver = createResolver(import.meta.url)
    const defineEmailPublicPath = await resolver.resolvePath('./runtime/define-email')
    const errorsPublicPath = await resolver.resolvePath('./runtime/errors')
    let renderEmailComponentPath = await resolver.resolvePath('./runtime/testing')
    if (options.codeBlock !== undefined) {
      const { setupCodeBlock } = await import('./code-block/setup')
      renderEmailComponentPath = setupCodeBlock(options.codeBlock, resolver)
    }
    const emailDirectory = resolve(nuxt.options.srcDir, 'emails')
    const loadTemplates = async () => {
      const discoveredTemplates = await discoverEmailTemplates(emailDirectory)
      return nuxt.options.dev
        ? attachPreviewFixtures(discoveredTemplates)
        : discoveredTemplates
    }
    let templates = await loadTemplates()
    const registryRuntimePaths = {
      emailRenderError: resolver.resolve('./runtime/render/errors'),
      renderEmailComponent: renderEmailComponentPath,
      templateRegistryErrors: resolver.resolve('./runtime/template-registry/errors'),
    }
    const registryTypePaths = {
      renderedEmail: resolver.resolve('./runtime/render/types'),
    }
    const registryId = '#nuxt-email/registry'
    addServerTemplate({
      filename: registryId,
      getContents: () => generateEmailRegistry(templates, registryRuntimePaths),
    })
    const typeTemplate = addTypeTemplate({
      filename: 'types/nuxt-email.d.ts',
      write: true,
      getContents: () => generateEmailTypes(templates, registryTypePaths),
    }, { nitro: true })

    addServerImports([
      {
        name: 'renderEmail',
        from: registryId,
      },
    ])
    for (const name of EMAIL_COMPONENT_NAMES) {
      addComponent({
        name,
        export: name,
        filePath: resolver.resolve(`./runtime/components/${name}`),
        mode: 'server',
      })
    }
    if (nuxt.options.dev) {
      addServerHandler({
        route: '/__email',
        method: 'get',
        env: 'dev',
        handler: resolver.resolve('./runtime/dev-preview/page.get'),
      })
      addServerHandler({
        route: '/__email/api/templates',
        method: 'get',
        env: 'dev',
        handler: resolver.resolve('./runtime/dev-preview/templates.get'),
      })
      addServerHandler({
        route: '/__email/render',
        method: 'get',
        env: 'dev',
        handler: resolver.resolve('./runtime/dev-preview/render.get'),
      })
    }

    let reloadRegistry = async (): Promise<void> => {}
    nuxt.hook('ready', () => {
      const nitro = useNitro()
      reloadRegistry = async () => {
        await nitro.hooks.callHook('rollup:reload')
      }
    })

    nuxt.hook('builder:watch', async (event, path) => {
      if (!['add', 'unlink', 'addDir', 'unlinkDir'].includes(event)) {
        return
      }

      const absolutePath = isAbsolute(path) ? path : resolve(nuxt.options.srcDir, path)
      const relativePath = relative(emailDirectory, absolutePath).replaceAll('\\', '/')
      if (relativePath === '..' || relativePath.startsWith('../') || isAbsolute(relativePath)) {
        return
      }

      const nextTemplates = await loadTemplates()
      templates = nextTemplates
      await updateTemplates({
        filter: template => template.filename === typeTemplate.filename,
      })
      await reloadRegistry()
    })

    const nuxtOptions = nuxt.options as typeof nuxt.options & NitroRollupOptions
    const nuxtAlias = (nuxt.options.alias ??= {})
    nuxtAlias['#nuxt-email/testing'] = renderEmailComponentPath
    const nitro = (nuxtOptions.nitro ??= {})
    const alias = (nitro.alias ??= {})
    alias['#nuxt-email/testing'] = renderEmailComponentPath
    alias['@lupinum/nuxt-email/define-email'] = defineEmailPublicPath
    alias['@lupinum/nuxt-email/errors'] = errorsPublicPath
    const externals = (nitro.externals ??= {})
    const inline = (externals.inline ??= [])
    for (const publicRuntimePath of [defineEmailPublicPath, errorsPublicPath]) {
      if (!inline.includes(publicRuntimePath)) {
        inline.push(publicRuntimePath)
      }
    }
    const typescript = (nitro.typescript ??= {})
    const tsConfig = (typescript.tsConfig ??= {})
    const compilerOptions = (tsConfig.compilerOptions ??= {})
    const paths = (compilerOptions.paths ??= {})
    paths[registryId] = [typeTemplate.dst]
    paths['#nuxt-email/testing'] = [renderEmailComponentPath]

    nitro.rollupConfig ??= {}
    const existingPlugins = nitro.rollupConfig.plugins
    nitro.rollupConfig.plugins = existingPlugins
      ? [existingPlugins, vue()]
      : [vue()]
  },
})
