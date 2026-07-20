import oracle from './oracle/react-email-6.9.0.json'
import { describe, expect, it } from 'vitest'
import { ECodeBlock } from '../../src/runtime/components/ECodeBlock'
import type { CodeBlockLanguage } from '../../src/runtime/components/code-block-languages'
import { dracula, oneDark } from '../../src/runtime/components/code-block-themes'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { normalizeEmailHtml } from './normalize'

// Identical to the fixtures in scripts/generate-react-oracle.ts.
const codeSnippet = 'const greeting = \'hi\';\nfunction wave() {\n  return greeting;\n}'
const cssSnippet = '.btn {\n  color: red;\n  padding: 4px 8px;\n}'

// nbsp + zero-width-joiner + zero-width-space, one per source space.
const SPACE = '\xA0‍​'

async function render(props: Record<string, unknown>): Promise<string> {
  return renderComponentToHtml(ECodeBlock, props)
}

describe('ECodeBlock', () => {
  it('matches the dracula JavaScript oracle with exact space substitution', {
    tags: ['conformance:code-block-basic'],
  }, async () => {
    const html = await render({ code: codeSnippet, language: 'javascript', theme: dracula })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['code-block-basic'].html))

    // Exact bytes: the plain-string token " greeting " keeps its nbsp+ZWJ+ZWSP encoding.
    expect(html).toContain(`<span>${SPACE}greeting${SPACE}</span>`)
    expect(html).not.toContain(' greeting ')
    // Theme token styles and React-style attribute escaping survive verbatim.
    expect(html).toContain('<span style="color:#8be9fd">const</span>')
    expect(html).toContain('<span style="color:#50fa7b">&#x27;hi&#x27;</span>')
    // React's vendor-prefix hyphenation (leading dash), which Vue does not produce.
    expect(html).toContain('-moz-tab-size:4')
    expect(html).toContain('<br/>')
  })

  it('matches the line-numbers oracle including the prefix span and font family', {
    tags: ['conformance:code-block-line-numbers'],
  }, async () => {
    const html = await render({
      code: codeSnippet,
      language: 'javascript',
      theme: dracula,
      lineNumbers: true,
      fontFamily: 'monospace',
    })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['code-block-line-numbers'].html))
    expect(html).toContain('<span style="width:2em;height:1em;display:inline-block;font-family:monospace">1</span>')
    // fontFamily is the inherited style, so it precedes the token's own color.
    expect(html).toContain('<span style="font-family:monospace;color:#8be9fd">const</span>')
  })

  it('matches the oneDark CSS oracle with css-grammar tokenization', {
    tags: ['conformance:code-block-css-lang'],
  }, async () => {
    const html = await render({ code: cssSnippet, language: 'css', theme: oneDark })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['code-block-css-lang'].html))
    // Double-quoted font-family entries escape as &quot;, matching React.
    expect(html).toContain('&quot;Fira Code&quot;')
  })

  it('throws a typed error when the language grammar is unavailable', async () => {
    await expect(render({
      code: 'const x = 1;',
      language: 'totally-not-a-language' as CodeBlockLanguage,
      theme: dracula,
    })).rejects.toThrow(
      'ECodeBlock: There is no language defined on Prism called totally-not-a-language',
    )
  })
})
