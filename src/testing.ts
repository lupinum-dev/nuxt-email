import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { CodeBlockModule } from './compiler/build-templates'
import { compileEmailDirectory } from './compiler/build-templates'
import { defaultNuxtAlias, resolveEmailDirectory } from './compiler/directory'
import { generateCodeBlockComponent } from './code-block/generate-component'
import type { CodeBlockOptions } from './code-block/options'
import { normalizeCodeBlockOptions } from './code-block/options'
import type { EmailRenderArgs, RenderedEmail } from './runtime/render/index'

// The module builder keeps src/runtime external, so the errors exported here are the
// classes the published renderer throws.
export { EmailRenderError, UnknownEmailTemplateError } from './runtime/render/index'
export type { RenderedEmail } from './runtime/render/index'
export type { CodeBlockOptions } from './code-block/options'

export interface CreateTestRendererOptions {
  /** Application root, without loading its Nuxt configuration. */
  rootDir: string
  /** Template directory relative to rootDir. Defaults to app/emails. */
  templatesDir?: string
  /** The `codeBlock` option of the Nuxt module, when templates use `ECodeBlock`. */
  codeBlock?: CodeBlockOptions
}

/** Template props by name. A Nuxt project passes the generated `EmailTemplateProps`. */
export type EmailTemplatePropsMap<Templates> = { [Name in keyof Templates]: object }

export interface TestRenderer<Templates extends EmailTemplatePropsMap<Templates>> {
  renderEmail: <Name extends keyof Templates & string>(name: Name, ...args: EmailRenderArgs<Templates[Name]>) => Promise<RenderedEmail>
}

const here = dirname(fileURLToPath(import.meta.url))
// Under Vitest this file runs from source (.ts); the published runtime is .js.
const extension = import.meta.url.endsWith('.ts') ? 'ts' : 'js'
const runtimeUrl = (path: string) => pathToFileURL(join(here, 'runtime', `${path}.${extension}`)).href

function codeBlockModule(options: CodeBlockOptions): CodeBlockModule {
  const normalized = normalizeCodeBlockOptions(options)
  const require = createRequire(import.meta.url)
  const resolved = (specifier: string) => pathToFileURL(require.resolve(specifier)).href
  return {
    resolveDir: here,
    source: generateCodeBlockComponent(normalized, {
      core: resolved('@shikijs/core'),
      createCodeBlockComponent: runtimeUrl('code-block/create-component'),
      engineJavaScript: resolved('@shikijs/engine-javascript'),
      languages: normalized.languages.map(language => resolved(`@shikijs/langs/${language}`)),
      theme: resolved(`@shikijs/themes/${normalized.theme}`),
    }),
  }
}

/**
 * Compile the email directory with the same compiler as the Nuxt module and the standalone
 * build, and return its `renderEmail`. Each call compiles again; there is no cache.
 */
export async function createTestRenderer<Templates extends EmailTemplatePropsMap<Templates> = Record<string, Record<string, unknown>>>(
  options: CreateTestRendererOptions,
): Promise<TestRenderer<Templates>> {
  const { rootDir, directory } = resolveEmailDirectory(options.rootDir, options.templatesDir)
  // Under rootDir/node_modules, so packages resolve from the project like in the real build
  // and a killed run leaves nothing in the project files.
  const cache = join(rootDir, 'node_modules/.cache/nuxt-email')
  await mkdir(cache, { recursive: true })
  const outfile = join(cache, `test-renderer-${randomUUID()}.mjs`)
  try {
    await compileEmailDirectory({
      directory,
      outfile,
      renderer: runtimeUrl('render/index'),
      packages: 'external',
      absWorkingDir: rootDir,
      alias: defaultNuxtAlias(rootDir, directory),
      codeBlock: options.codeBlock === undefined ? undefined : codeBlockModule(options.codeBlock),
    })
    // The compiled registry is untyped; `Templates` describes the templates it was compiled from.
    const registry: TestRenderer<Templates> = await import(/* @vite-ignore */ pathToFileURL(outfile).href)
    return { renderEmail: registry.renderEmail }
  }
  finally {
    await rm(outfile, { force: true })
  }
}
