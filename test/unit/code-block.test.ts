import { createHighlighterCore } from '@shikijs/core'
import { createJavaScriptRegexEngine } from '@shikijs/engine-javascript'
import typescript from '@shikijs/langs/typescript'
import githubDark from '@shikijs/themes/github-dark'
import { afterAll, describe, expect, it } from 'vitest'
import type { Component } from 'vue'
import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import {
  generateCodeBlockComponent,
} from '../../src/code-block/generate-component'
import { normalizeCodeBlockOptions } from '../../src/code-block/options'
import { createCodeBlockComponent } from '../../src/runtime/code-block/create-component'
import { renderPlainText } from '../../src/runtime/render/plain-text'

async function renderComponentToHtml(component: Component, props?: Record<string, unknown>): Promise<string> {
  const app = createSSRApp({ render: () => h(component, props) })
  // Vue SSR resolves to `<!---->` when an async setup throws; rethrow the real error.
  let failure: { cause: unknown } | undefined
  app.config.errorHandler = (error) => {
    failure ??= { cause: error }
  }
  const html = await renderToString(app)
  if (failure !== undefined) throw failure.cause
  return html
}

const highlighterPromise = createHighlighterCore({
  langs: [typescript],
  themes: [githubDark],
  engine: createJavaScriptRegexEngine(),
})
const ECodeBlock = createCodeBlockComponent({
  enabledLanguages: ['typescript'] as const,
  theme: 'github-dark',
  async highlight(code, language) {
    const highlighter = await highlighterPromise
    return highlighter.codeToTokens(code, {
      lang: language,
      theme: 'github-dark',
    })
  },
})

afterAll(async () => {
  const highlighter = await highlighterPromise
  highlighter.dispose()
})

describe('configured code blocks', () => {
  it('renders real Shiki tokens as escaped, inline-styled email markup', async () => {
    const html = await renderComponentToHtml(ECodeBlock, {
      code: 'const answer: string = "<script>"\nconsole.log(answer)',
      language: 'typescript',
      lineNumbers: true,
    })

    expect(html).toContain('data-code-theme="github-dark"')
    expect(html).toContain('background-color:#24292e')
    expect(html).not.toContain('width:100%')
    expect(html).toContain('color:#F97583')
    expect(html).toContain('color:#9ECBFF')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).toContain('>1</span>')
    expect(html).toContain('>2</span>')
    expect(html).toContain('console')
    expect(renderPlainText(html)).toBe(
      'const answer: string = "<script>"\nconsole.log(answer)',
    )
  })

  it('keeps empty lines and trailing newlines without leaking multi-digit line numbers into text', async () => {
    const source = Array.from({ length: 11 }, (_, index) => (
      index === 3 ? '' : `const value${index + 1} = ${index + 1}`
    )).join('\n') + '\n'
    const StyledCodeBlock = defineComponent({
      setup: () => () => h(ECodeBlock, {
        code: source,
        language: 'typescript',
        lineNumbers: true,
        style: 'padding: 12px',
      }),
    })
    const html = await renderComponentToHtml(StyledCodeBlock)

    expect(html).toContain('padding:12px')
    expect(html).toContain('>10</span>')
    expect(html).toContain('>12</span>')
    expect(renderPlainText(html)).toBe(source)
  })

  it('renders empty source without inventing content', async () => {
    const html = await renderComponentToHtml(ECodeBlock, {
      code: '',
      language: 'typescript',
      lineNumbers: true,
    })

    expect(renderPlainText(html)).toBe('')
  })

  it('rejects languages outside the configured allowlist before highlighting', async () => {
    await expect(renderComponentToHtml(ECodeBlock, {
      code: 'print("no")',
      language: 'python',
    })).rejects.toThrow(
      'ECodeBlock language "python" is not enabled. Enabled languages: typescript',
    )
  })

  // Nuxt layers join arrays, so a layer and the app can both enable a language.
  it('keeps a language configured twice once', () => {
    expect(normalizeCodeBlockOptions({ languages: ['typescript', 'vue', 'typescript'], theme: 'github-dark' }).languages)
      .toEqual(['typescript', 'vue'])
  })

  it('generates imports for only the resolved language modules', () => {
    const options = normalizeCodeBlockOptions({
      languages: ['typescript', 'vue'],
      theme: 'github-dark',
    })
    const generated = generateCodeBlockComponent(options, {
      core: '/deps/shiki-core.mjs',
      createCodeBlockComponent: '/runtime/create-code-block.js',
      engineJavaScript: '/deps/shiki-engine.mjs',
      languages: ['/langs/typescript.mjs', '/langs/vue.mjs'],
      theme: '/themes/github-dark.mjs',
    })

    expect(generated).toContain('import language0 from "/langs/typescript.mjs"')
    expect(generated).toContain('import language1 from "/langs/vue.mjs"')
    expect(generated).toContain('const enabledLanguages = Object.freeze(["typescript", "vue"])')
    expect(generated).toContain('highlighterPromise ??= createHighlighterCore')
    expect(generated).toContain('const highlighter = await getHighlighter()')
    expect(generated).not.toContain('@shikijs/langs')
    expect(generated).not.toContain('bundle/web')
  })
})
