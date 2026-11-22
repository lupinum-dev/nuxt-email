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
import type { InspectedEmail } from './runtime/render-email'
import type { EmailRenderArgs, RenderedEmail } from './runtime/render/index'
import { EmailRenderError } from './runtime/render/index'

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
  /**
   * Classes that may stay in `class` as written, such as a class that only another tool
   * reads. A render that keeps any other class fails. `true` allows every class.
   */
  allowUnknownClasses?: true | readonly string[]
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

/** The cause of the render error for classes that the test renderer does not allow. */
function unknownClassesError(classes: readonly string[]): TypeError {
  return new TypeError(
    `The email kept these classes as written: ${classes.join(', ')}. `
    + 'Tailwind does not know them, they have no effect alone, or the build did not find them in the source. '
    + 'Correct them, add names built at run time to @source inline("...") in tailwind.css, '
    + 'or pass the classes that must stay in allowUnknownClasses.',
  )
}

/**
 * Compile the email directory with the same compiler as the Nuxt module and the standalone
 * build, and return its `renderEmail`. Each call compiles again; there is no cache.
 *
 * Unlike production, a render fails when it keeps a class as written: a test is the place
 * to find a class that has no effect.
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
      renderer: runtimeUrl('render-email'),
      inspect: true,
      packages: 'external',
      absWorkingDir: rootDir,
      alias: defaultNuxtAlias(rootDir, directory),
      codeBlock: options.codeBlock === undefined ? undefined : codeBlockModule(options.codeBlock),
    })
    // The compiled registry is untyped; `Templates` describes the templates it was compiled from.
    const registry: {
      inspectEmail: (name: string, props?: object) => Promise<InspectedEmail>
    } = await import(/* @vite-ignore */ pathToFileURL(outfile).href)
    const allowed = options.allowUnknownClasses
    return {
      async renderEmail(name, ...[props]) {
        const { unknownClasses, ...email } = await registry.inspectEmail(name, props)
        if (allowed !== true) {
          const unknown = unknownClasses.filter(className => !allowed?.includes(className))
          if (unknown.length > 0) throw new EmailRenderError(name, unknownClassesError(unknown))
        }
        return email
      },
    }
  }
  finally {
    await rm(outfile, { force: true })
  }
}
