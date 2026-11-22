import { isAbsolute, relative, resolve } from 'node:path'
import {
  addServerImports,
  addServerHandler,
  addServerTemplate,
  addTypeTemplate,
  createResolver,
  defineNuxtModule,
  updateTemplates,
  useNitro,
} from '@nuxt/kit'
import type { CodeBlockOptions } from './code-block/options'
import { compileEmailDirectory } from './compiler/build-templates'
import { attachPreviewFixtures } from './dev-preview/fixtures'
import { EMAIL_TAGS } from './runtime/components/email-tags'
import { discoverEmailTemplates } from './template-registry/discovery'
import { generateEmailTypes } from './template-registry/generation'

export type { EmailComponentProps, RenderedEmail } from './runtime/render-email'
export type { CodeBlockOptions } from './code-block/options'

type NitroRollupOptions = {
  nitro?: {
    alias?: Record<string, string>
    externals?: {
      inline?: Array<string | RegExp | ((id: string, importer?: string) => boolean | Promise<boolean>)>
    }
    typescript?: {
      tsConfig?: EmailTypeProjectConfig
    }
  }
}

interface EmailTypeProjectConfig {
  compilerOptions?: {
    paths?: Record<string, string[]>
  }
  exclude?: string[]
  include?: string[]
}

function configureEmailTypeProject(
  tsConfig: EmailTypeProjectConfig,
  emailDirectory: string,
  registryId: string,
  registryPath: string,
): Record<string, string[]> {
  const normalizedDirectory = emailDirectory.replaceAll('\\', '/')
  const include = (tsConfig.include ??= [])
  const emailTypeGlob = `${normalizedDirectory}/**/*.vue`
  if (!include.includes(emailTypeGlob)) {
    include.push(emailTypeGlob)
  }

  const exclude = (tsConfig.exclude ??= [])
  const emailComponentTypeGlob = `${normalizedDirectory}/components/**/*.vue`
  if (!exclude.includes(emailComponentTypeGlob)) {
    exclude.push(emailComponentTypeGlob)
  }

  const paths = (tsConfig.compilerOptions ??= {}).paths ??= {}
  paths[registryId] = [registryPath]
  return paths
}

function previewURL(baseURL: string): string {
  return `${baseURL.endsWith('/') ? baseURL : `${baseURL}/`}__email`
}

function relativeEmailPath(emailDirectory: string, path: string, roots: string[]): string | undefined {
  const candidates = isAbsolute(path) ? [path] : roots.map(root => resolve(root, path))
  for (const candidate of candidates) {
    const relativePath = relative(emailDirectory, candidate).replaceAll('\\', '/')
    if (relativePath !== '..' && !relativePath.startsWith('../') && !isAbsolute(relativePath)) {
      return relativePath
    }
  }
}

export interface ModuleOptions {
  codeBlock?: CodeBlockOptions
}

/**
 * Nitro 2 exposes its auto-import list as `nitro.unimport`. Nuxt 4.6 types the property as
 * `unknown`, because the server builder declares the Nitro instance type and Nitro 3 differs.
 */
function hasInjectImports(value: unknown): value is { injectImports: (code: string, id: string) => Promise<{ code: string }> } {
  return typeof value === 'object' && value !== null && 'injectImports' in value && typeof value.injectImports === 'function'
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: '@lupinum/nuxt-email',
    configKey: 'nuxtEmail',
    compatibility: {
      nuxt: '>=4.5.1 <5',
    },
  },
  async setup(options, nuxt) {
    const optionNames = Object.keys(options).filter(name => name !== 'codeBlock').sort()
    if (optionNames.length > 0) {
      throw new TypeError(`nuxt-email received unsupported module options: ${optionNames.join(', ')}`)
    }

    const resolver = createResolver(import.meta.url)
    const errorsPublicPath = await resolver.resolvePath('./runtime/errors')
    let codeBlockPath: string | undefined
    if (options.codeBlock !== undefined) {
      const { setupCodeBlock } = await import('./code-block/setup')
      const codeBlock = setupCodeBlock(options.codeBlock, resolver)
      codeBlockPath = codeBlock.componentPath
    }
    // The email compiler supplies the tags, so they are not Nuxt components: a server
    // component would make Nuxt serve the /__nuxt_island/** renderer in production.
    // Editors and vue-tsc learn the tags from this declaration.
    const componentTypes = [
      ...EMAIL_TAGS.map(name => [name, resolver.resolve(`./runtime/components/${name}`)] as const),
      ...(codeBlockPath === undefined ? [] : [['ECodeBlock', codeBlockPath.replace(/\.ts$/, '')] as const]),
    ]
    addTypeTemplate({
      filename: 'types/nuxt-email-components.d.ts',
      getContents: () => `declare module 'vue' {\n  export interface GlobalComponents {\n${
        componentTypes.map(([name, path]) => `    ${name}: typeof import(${JSON.stringify(path)})['${name}']\n`).join('')
      }  }\n}\nexport {}\n`,
    })
    const emailDirectory = resolve(nuxt.options.srcDir, 'emails')
    const loadTemplates = async () => {
      const discoveredTemplates = await discoverEmailTemplates(emailDirectory)
      return nuxt.options.dev
        ? attachPreviewFixtures(discoveredTemplates)
        : discoveredTemplates
    }
    let templates = await loadTemplates()
    const registryId = '#nuxt-email/registry'
    const rendererPath = resolver.resolve('./runtime/render-email')
    // Files the last registry build read; a change to one of them rebuilds it in development.
    let registryInputs = new Set<string>()
    // Built on every load, so a dev rebuild always sees the current sources and tailwind.css.
    addServerTemplate({
      filename: registryId,
      getContents: async () => {
        const { code, inputs } = await compileEmailDirectory({
          directory: emailDirectory,
          templates,
          renderer: rendererPath,
          inspect: nuxt.options.dev,
          codeBlock: codeBlockPath,
          packages: 'external',
          alias: nuxt.options.alias,
          externalHashImports: true,
          absWorkingDir: nuxt.options.rootDir,
        })
        registryInputs = new Set(inputs)
        // Nitro's auto-import plugin skips virtual modules; inject what templates use
        // (server/utils, h3) with Nitro's own import list, as it would for a template file.
        const unimport = useNitro().unimport
        return hasInjectImports(unimport) ? (await unimport.injectImports(code, registryId)).code : code
      },
    })
    const registryTypePaths = {
      renderedEmail: rendererPath,
    }
    const typeTemplate = addTypeTemplate({
      filename: 'types/nuxt-email.d.ts',
      write: true,
      getContents: () => generateEmailTypes(templates, registryTypePaths),
    }, { nitro: true })
    nuxt.hook('prepare:types', ({ tsConfig }) => {
      configureEmailTypeProject(tsConfig, emailDirectory, registryId, typeTemplate.dst)
    })

    addServerImports([
      {
        name: 'renderEmail',
        from: registryId,
      },
    ])
    if (nuxt.options.dev) {
      nuxt.hook('devtools:customTabs', (tabs) => {
        tabs.push({
          name: 'nuxt-email',
          title: 'Nuxt Email',
          icon: 'i-lucide-mail',
          view: {
            type: 'iframe',
            src: previewURL(nuxt.options.app.baseURL),
          },
        })
      })
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

    let registryUpdates = Promise.resolve()
    nuxt.hook('builder:watch', (event, path) => {
      const roots = [nuxt.options.rootDir, nuxt.options.srcDir]
      const relativePath = relativeEmailPath(emailDirectory, path, roots)
      // `resolve` also normalises an absolute path, so it matches the native separators of the inputs on Windows.
      const imported = roots.some(root => registryInputs.has(resolve(root, path)))
      if (relativePath === undefined && !imported) {
        return
      }

      // Any change can add a class or edit tailwind.css, so every event rebuilds the
      // registry; only structure changes inside app/emails rediscover templates and types.
      const structureChanged = relativePath !== undefined && ['add', 'unlink', 'addDir', 'unlinkDir'].includes(event)
      const update = async () => {
        if (structureChanged) {
          templates = await loadTemplates()
          await updateTemplates({
            filter: template => template.filename === typeTemplate.filename,
          })
        }
        await reloadRegistry()
      }
      const queuedUpdate = registryUpdates.then(update, update)
      registryUpdates = queuedUpdate.catch(() => {})
      return queuedUpdate
    })

    const nuxtOptions = nuxt.options as typeof nuxt.options & NitroRollupOptions
    const nitro = (nuxtOptions.nitro ??= {})
    const alias = (nitro.alias ??= {})
    alias['@lupinum/nuxt-email/errors'] = errorsPublicPath
    const externals = (nitro.externals ??= {})
    const inline = (externals.inline ??= [])
    if (!inline.includes(errorsPublicPath)) {
      inline.push(errorsPublicPath)
    }
    const typescript = (nitro.typescript ??= {})
    const tsConfig = (typescript.tsConfig ??= {})
    configureEmailTypeProject(tsConfig, emailDirectory, registryId, typeTemplate.dst)
  },
})
