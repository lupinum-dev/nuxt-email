import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { dirname, relative } from 'node:path'
import type { Plugin } from 'esbuild'
import { compileScript, compileTemplate, parse } from 'vue/compiler-sfc'

/** Compile the portable email-authoring subset without Nuxt/Vite configuration. */
export function emailTemplatesPlugin(directory: string): Plugin {
  return {
    name: 'nuxt-email-templates',
    setup(build) {
      build.onLoad({ filter: /\.vue$/ }, async ({ path }) => {
        const { descriptor, errors } = parse(await readFile(path, 'utf8'), { filename: path })
        if (errors.length > 0) throw errors[0]
        if (descriptor.styles.length || descriptor.customBlocks.length) {
          throw new Error('Standalone email templates do not support style or custom blocks. Use ETailwind or inline styles.')
        }
        if ([descriptor.script, descriptor.scriptSetup, descriptor.template].some(block => block?.src)) {
          throw new Error('Standalone email templates do not support external SFC blocks. Import local components instead.')
        }
        if ([descriptor.script, descriptor.scriptSetup].some(block => block?.lang && !['js', 'ts'].includes(block.lang))
          || (descriptor.template?.lang && descriptor.template.lang !== 'html')) {
          throw new Error('Standalone email templates support JavaScript/TypeScript scripts and HTML templates only.')
        }
        const id = createHash('sha256').update(relative(directory, path).replaceAll('\\', '/')).digest('hex').slice(0, 8)
        const script = descriptor.script || descriptor.scriptSetup
          ? compileScript(descriptor, { id, genDefaultAs: '__emailComponent', inlineTemplate: false, isProd: true })
          : undefined
        const template = descriptor.template
          ? compileTemplate({
              source: descriptor.template.content, filename: path, id, isProd: true,
              compilerOptions: { bindingMetadata: script?.bindings }, transformAssetUrls: false,
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
