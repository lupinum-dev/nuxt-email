import { isAbsolute, relative, resolve } from 'node:path'
import {
  addComponentExports,
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
import { attachPreviewFixtures } from './preview-fixtures'
import { discoverEmailTemplates } from './template-discovery'
import { generateEmailRegistry, generateEmailTypes } from './template-generation'

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

type ModuleOptions = Record<string, never>

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-email',
  },
  async setup(options, nuxt) {
    const optionNames = Object.keys(options).sort()
    if (optionNames.length > 0) {
      throw new TypeError(`nuxt-email does not accept module options; received: ${optionNames.join(', ')}`)
    }

    const resolver = createResolver(import.meta.url)
    const defineEmailPublicPath = await resolver.resolvePath('./runtime/define-email')
    const errorsPublicPath = await resolver.resolvePath('./runtime/errors')
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
      renderEmailComponent: resolver.resolve('./runtime/render/render-email-component'),
      serverErrors: resolver.resolve('./runtime/server/errors'),
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
    addComponentExports({
      filePath: resolver.resolve('./runtime/components/email-components'),
      mode: 'server',
    })

    if (nuxt.options.dev) {
      addServerHandler({
        route: '/__email',
        method: 'get',
        env: 'dev',
        handler: resolver.resolve('./runtime/server/preview-page.get'),
      })
      addServerHandler({
        route: '/__email/api/templates',
        method: 'get',
        env: 'dev',
        handler: resolver.resolve('./runtime/server/preview-templates.get'),
      })
      addServerHandler({
        route: '/__email/render',
        method: 'get',
        env: 'dev',
        handler: resolver.resolve('./runtime/server/preview-render.get'),
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
    const nitro = (nuxtOptions.nitro ??= {})
    const alias = (nitro.alias ??= {})
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

    nitro.rollupConfig ??= {}
    const existingPlugins = nitro.rollupConfig.plugins
    nitro.rollupConfig.plugins = existingPlugins
      ? [existingPlugins, vue()]
      : [vue()]
  },
})
