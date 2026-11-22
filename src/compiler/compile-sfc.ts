import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import type { Plugin } from 'esbuild'
import type { CompilerOptions } from 'vue/compiler-sfc'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'

interface EmailSfcPluginOptions {
  nodeTransforms?: CompilerOptions['nodeTransforms']
}

/**
 * The SFC compile step of the one template build: compiles the email-authoring subset
 * of every `.vue` file the build loads, for Nuxt, the standalone build and tests alike.
 * The script compiles with `isProd: false` so props declared with
 * `defineProps<T>()` keep `type` and `required`; a production compile reduces
 * them to `{}`, which hides missing required props from the renderer's check.
 */
export function emailSfcPlugin(directory: string, options: EmailSfcPluginOptions = {}): Plugin {
  return {
    name: 'nuxt-email-sfc',
    setup(build) {
      build.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
        const { descriptor, errors } = parse(await readFile(path, 'utf8'), { filename: path })
        if (errors.length > 0) throw errors[0]
        if (descriptor.styles.length || descriptor.customBlocks.length) {
          throw new Error(`Email templates do not support style or custom blocks (${path}). Use Tailwind classes or inline styles.`)
        }
        if ([descriptor.script, descriptor.scriptSetup, descriptor.template].some(block => block?.src)) {
          throw new Error(`Email templates do not support external SFC blocks (${path}). Import local components instead.`)
        }
        if ([descriptor.script, descriptor.scriptSetup].some(block => block?.lang && !['js', 'ts'].includes(block.lang))
          || (descriptor.template?.lang && descriptor.template.lang !== 'html')) {
          throw new Error(`Email templates support JavaScript/TypeScript scripts and HTML templates only (${path}).`)
        }
        const id = createHash('sha256').update(relative(directory, path).replaceAll('\\', '/')).digest('hex').slice(0, 8)
        const script = descriptor.script || descriptor.scriptSetup
          ? compileScript(descriptor, { id, genDefaultAs: '__emailComponent', inlineTemplate: false, isProd: false })
          : undefined
        const template = descriptor.template
          ? compileTemplate({
              source: descriptor.template.content, filename: path, id, isProd: true,
              compilerOptions: { bindingMetadata: script?.bindings, nodeTransforms: options.nodeTransforms }, transformAssetUrls: false,
            })
          : undefined
        if (template?.errors.length) throw template.errors[0]
        return {
          contents: [
            script?.content ?? 'const __emailComponent = {}',
            template?.code ?? '',
            template ? '__emailComponent.render = render' : '',
            'export default __emailComponent',
          ].join('\n'),
          loader: 'ts', resolveDir: dirname(path),
        }
      })
    },
  }
}
