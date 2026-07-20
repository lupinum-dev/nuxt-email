import type { Component } from 'vue'
import oracle from './oracle/react-email-6.9.0.json'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import type { EFontProps } from '../../src/runtime/components/EFont'
import { EBody, EHead, EHtml } from '../../src/runtime/components'
import { EFont } from '../../src/runtime/components/EFont'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { normalizeEmailHtml } from './normalize'

const BODY_COPY = 'Sample body copy in the branded font.'

function fontDocument(fontProps: EFontProps): Component {
  return defineComponent({
    name: 'FontFixture',
    setup() {
      return () => h(EHtml, null, {
        default: () => [
          h(EHead, null, { default: () => h(EFont, fontProps) }),
          h(EBody, null, { default: () => BODY_COPY }),
        ],
      })
    },
  })
}

async function renderFont(fontProps: EFontProps): Promise<string> {
  return renderComponentToHtml(fontDocument(fontProps))
}

describe('EFont', () => {
  it('matches font-defaults: @font-face defaults, first fallback, global rule', {
    tags: ['conformance:font-defaults'],
  }, async () => {
    const html = await renderFont({ fontFamily: 'Roboto', fallbackFontFamily: 'Verdana' })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['font-defaults'].html))

    // Exact @font-face fragment (empty src line preserved as bare indentation).
    expect(html).toContain(
      `@font-face {\n      font-family: 'Roboto';\n      font-style: normal;\n      font-weight: 400;\n      mso-font-alt: 'Verdana';\n      \n    }`,
    )
    expect(html).toContain(`font-family: 'Roboto', Verdana;`)
  })

  it('matches font-webfont: src url/format plus custom weight and style', {
    tags: ['conformance:font-webfont'],
  }, async () => {
    const html = await renderFont({
      fontFamily: 'Roboto',
      fallbackFontFamily: 'Verdana',
      webFont: { url: 'https://example.com/roboto.woff2', format: 'woff2' },
      fontWeight: 700,
      fontStyle: 'italic',
    })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['font-webfont'].html))

    expect(html).toContain(
      `@font-face {\n      font-family: 'Roboto';\n      font-style: italic;\n      font-weight: 700;\n      mso-font-alt: 'Verdana';\n      src: url(https://example.com/roboto.woff2) format('woff2');\n    }`,
    )
  })

  it('matches font-multiple-fallbacks: first array entry for mso, all joined globally', {
    tags: ['conformance:font-multiple-fallbacks'],
  }, async () => {
    const html = await renderFont({
      fontFamily: 'Roboto',
      fallbackFontFamily: ['Georgia', 'serif'],
    })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['font-multiple-fallbacks'].html))

    expect(html).toContain(`mso-font-alt: 'Georgia';`)
    expect(html).toContain(`font-family: 'Roboto', Georgia, serif;`)
  })
})
