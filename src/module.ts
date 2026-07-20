import { isAbsolute, relative, resolve } from 'node:path'
import {
  addComponentsDir,
  addServerImports,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  updateTemplates,
  useNitro,
} from '@nuxt/kit'
import vue from '@vitejs/plugin-vue'
import { discoverEmailTemplates } from './template-discovery'
import { generateEmailRegistry, generateEmailTypes } from './template-generation'

type NitroRollupOptions = {
  nitro?: {
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

export default defineNuxtModule({
  meta: {
    name: 'nuxt-email',
    configKey: 'nuxtEmail',
  },
  async setup(_options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const emailDirectory = resolve(nuxt.options.srcDir, 'emails')
    let templates = await discoverEmailTemplates(emailDirectory)
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

    addServerImports({
      name: 'renderEmail',
      from: registryId,
    })
    addComponentsDir({
      path: resolver.resolve('./runtime/components'),
      pattern: ['E*.ts', 'E*.js'],
      ignore: ['**/*.d.ts'],
      pathPrefix: false,
    })

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

      const nextTemplates = await discoverEmailTemplates(emailDirectory)
      templates = nextTemplates
      await updateTemplates({
        filter: template => template.filename === typeTemplate.filename,
      })
      await reloadRegistry()
    })

    const nuxtOptions = nuxt.options as typeof nuxt.options & NitroRollupOptions
    const nitro = (nuxtOptions.nitro ??= {})
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
