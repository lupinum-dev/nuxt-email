import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BuildOptions, Metafile, Plugin } from 'esbuild'
import { build } from 'esbuild'
import type { StyleTable } from '../runtime/tw'
import { EMAIL_TAGS } from '../runtime/components/email-tags'
import type { DiscoveredEmailTemplate } from '../template-registry/discovery'
import { discoverEmailTemplates } from '../template-registry/discovery'
import { generateEmailRendererRegistry } from '../template-registry/generation'
import { emailSfcPlugin } from './compile-sfc'
import { contains } from './directory'
import { createEmailStyleTable, EMAIL_TAILWIND_CSS, styleTableExpression } from './style-table'
import { createTailwindTransform } from './transform'

/** An extra module that exports `ECodeBlock`, compiled into the registry. */
export interface CodeBlockModule {
  source: string
  /** Directory its imports resolve from. */
  resolveDir: string
}

interface CompileEmailDirectoryOptions {
  /** The email directory (`app/emails`). */
  directory: string
  /** Also write the module to this file. Without it, only the text is returned. */
  outfile?: string
  /** Templates to compile, for example with preview fixtures attached. Defaults to the discovered templates. */
  templates?: readonly DiscoveredEmailTemplate[]
  /**
   * Module the registry imports `createEmailRenderer` from; it stays external and is imported as
   * written. Defaults to the renderer source, bundled into the output.
   */
  renderer?: string
  /** Development only: also export `inspectEmail` from the renderer module. */
  inspect?: boolean
  /** `external` keeps every package import external, resolved from where the output is loaded. */
  packages?: BuildOptions['packages']
  /** Imports that stay external when packages are bundled. Defaults to Vue only. */
  external?: BuildOptions['external']
  /** Import aliases such as Nuxt's `~` and `@`; the longest matching key wins. */
  alias?: Readonly<Record<string, string>>
  /** Keep `#` imports that no alias resolves external, for Nitro (`#imports`). Otherwise they fail the build. */
  externalHashImports?: boolean
  absWorkingDir?: string
  /** The `ECodeBlock` module: generated source to compile in, or a path that stays external. */
  codeBlock?: CodeBlockModule | string
}

export interface CompiledEmailDirectory {
  /** The registry ES module; it exports `emailTemplates` and `renderEmail`. */
  code: string
  styleTable: StyleTable
  metafile: Metafile
  /** Absolute paths of the source files the build read, plus `tailwind.css`; the dev watch list. */
  inputs: string[]
}

const rendererSource = fileURLToPath(new URL('../runtime/render-email', import.meta.url))
const runtimeDirectory = fileURLToPath(new URL('../runtime/', import.meta.url))
const STYLE_TABLE = 'virtual:nuxt-email-style-table'
const CODE_BLOCK = 'virtual:nuxt-email-code-block'

function virtualModules(placeholder: string, codeBlock: CodeBlockModule | undefined, external: ReadonlySet<string>): Plugin {
  return {
    name: 'nuxt-email-virtual',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^virtual:nuxt-email-/ }, ({ path }) => ({ path, namespace: 'nuxt-email' }))
      pluginBuild.onResolve({ filter: /^file:/ }, ({ path }) => ({ path, external: true }))
      pluginBuild.onResolve({ filter: /.*/ }, ({ path }) => external.has(path) ? { path, external: true } : undefined)
      pluginBuild.onLoad({ filter: /.*/, namespace: 'nuxt-email' }, ({ path }) => path === STYLE_TABLE
        // A free identifier: esbuild keeps it as written, and it is replaced after the build.
        ? { contents: `export default ${placeholder}`, loader: 'js' }
        : { contents: codeBlock!.source, resolveDir: codeBlock!.resolveDir, loader: 'js' })
    },
  }
}

/**
 * Resolve aliased imports (`~/components/x.vue`). A target inside `node_modules` keeps
 * the original import external, so the consumer's bundler decides about packages.
 */
function aliasPlugin(alias: Readonly<Record<string, string>>, externalHashImports: boolean): Plugin {
  const keys = Object.keys(alias).sort((left, right) => right.length - left.length)
  return {
    name: 'nuxt-email-alias',
    setup(pluginBuild) {
      pluginBuild.onResolve({ filter: /^[^./]/ }, async ({ path, importer, kind, resolveDir, pluginData }) => {
        if (pluginData === aliasPlugin) return
        const key = keys.find(name => path === name || path.startsWith(`${name}/`))
        if (key === undefined) return externalHashImports && path.startsWith('#') ? { path, external: true } : undefined
        const target = alias[key]! + path.slice(key.length)
        const result = await pluginBuild.resolve(target, { importer, kind, resolveDir, pluginData: aliasPlugin })
        if (result.errors.length > 0) return { errors: result.errors }
        return result.path.replaceAll('\\', '/').includes('/node_modules/') ? { path, external: true } : result
      })
    },
  }
}

/**
 * Compile every template in an email directory with the Tailwind transform and
 * bundle it with its style table into one registry module. The Nuxt module, the
 * standalone build and the test renderer all use this one path.
 *
 * The style table is built from the files the build read, so a component that a
 * template imports from outside the email directory contributes its classes too.
 */
export async function compileEmailDirectory(options: CompileEmailDirectoryOptions): Promise<CompiledEmailDirectory> {
  const { codeBlock } = options
  const directory = resolve(options.directory)
  const workingDirectory = options.absWorkingDir ?? process.cwd()
  const templates = options.templates ?? await discoverEmailTemplates(directory)
  const external = new Set<string>()
  if (options.renderer !== undefined) external.add(options.renderer)
  // The registry imports a module path without its `.ts` extension.
  if (typeof codeBlock === 'string') external.add(codeBlock.replace(/\.ts$/, ''))
  const entry = generateEmailRendererRegistry(templates, {
    createEmailRenderer: options.renderer ?? rendererSource,
    styleTable: STYLE_TABLE,
    codeBlock: codeBlock === undefined ? undefined : typeof codeBlock === 'string' ? codeBlock : CODE_BLOCK,
    inspect: options.inspect,
  })
  const tags = codeBlock === undefined ? EMAIL_TAGS : [...EMAIL_TAGS, 'ECodeBlock']
  const registryFile = join(directory, 'email-registry.js')
  const placeholder = `__NUXT_EMAIL_STYLE_TABLE_${randomUUID().replaceAll('-', '')}__`

  const result = await build({
    absWorkingDir: workingDirectory,
    tsconfigRaw: { compilerOptions: { target: 'ES2022', module: 'ESNext' } },
    stdin: { contents: entry, resolveDir: directory, sourcefile: registryFile },
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'node',
    target: 'node22',
    logLevel: 'silent',
    ...(options.packages === 'external' ? { packages: 'external' } : { external: options.external ?? ['vue', 'vue/*'] }),
    plugins: [
      virtualModules(placeholder, typeof codeBlock === 'string' ? undefined : codeBlock, external),
      aliasPlugin(options.alias ?? {}, options.externalHashImports ?? false),
      emailSfcPlugin(directory, { nodeTransforms: [createTailwindTransform({ tags })] }),
    ],
  })

  // Source files outside packages and outside this package's runtime; namespaced inputs are virtual.
  const sources = Object.keys(result.metafile.inputs)
    .filter(input => !/^[\w-]{2,}:/.test(input) && !input.replaceAll('\\', '/').includes('/node_modules/'))
    .map(input => isAbsolute(input) ? input : resolve(workingDirectory, input))
    .filter(input => input !== registryFile && !contains(runtimeDirectory, input))
  const styleTable = await createEmailStyleTable(directory, sources)
  const output = result.outputFiles[0]!.text
  const parts = output.split(placeholder)
  if (parts.length !== 2) throw new Error(`Expected one style table placeholder in the email registry, found ${parts.length - 1}.`)
  const code = parts.join(styleTableExpression(styleTable))
  if (options.outfile !== undefined) await writeFile(options.outfile, code)
  return { code, styleTable, metafile: result.metafile, inputs: [...sources, join(directory, EMAIL_TAILWIND_CSS)].sort() }
}

const PACKAGE_PATH = /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/

/** Names of the packages whose files a bundle includes, sorted. */
export function bundledPackages(metafile: Metafile): string[] {
  const packages = new Set<string>()
  for (const input of Object.keys(metafile.inputs)) {
    const match = PACKAGE_PATH.exec(input.replaceAll('\\', '/'))
    if (match) packages.add(match[1]!)
  }
  return [...packages].sort()
}
