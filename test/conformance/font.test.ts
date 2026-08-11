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

  it('serializes dynamic CSS values without allowing style-element breakout', async () => {
    const html = await renderFont({
      fontFamily: `Safe'</style><img src=x><style>`,
      fallbackFontFamily: 'Verdana',
      webFont: {
        format: 'woff2',
        url: 'https://example.com/font.woff2?name=</style><img src=x>',
      },
    })

    expect(html).not.toContain('</style><img')
    expect(html).not.toContain('<img src=x>')
    expect(html).toContain(`font-family: 'Safe\\'\\3C /style\\3E \\3C img src=x\\3E \\3C style\\3E ';`)
    expect(html).toContain(`url('https://example.com/font.woff2?name=\\3C /style\\3E \\3C img src=x\\3E ')`)
  })

  it('preserves a safe web-font URL with query parameters byte-for-byte', async () => {
    const html = await renderFont({
      fontFamily: 'Roboto',
      fallbackFontFamily: 'Verdana',
      webFont: {
        format: 'woff2',
        url: 'https://example.com/roboto.woff2?v=1&source=email',
      },
    })

    expect(html).toContain('src: url(https://example.com/roboto.woff2?v=1&source=email) format(\'woff2\');')
  })

  it.each([
    {
      message: 'EFont fontFamily must be a non-empty string',
      props: { fontFamily: '', fallbackFontFamily: 'Verdana' },
    },
    {
      message: 'EFont fallbackFontFamily must contain at least one fallback',
      props: { fontFamily: 'Roboto', fallbackFontFamily: [] },
    },
    {
      message: 'EFont fontStyle must be normal, italic, or oblique',
      props: { fontFamily: 'Roboto', fallbackFontFamily: 'Verdana', fontStyle: '</style>' },
    },
    {
      message: 'EFont fontWeight must be between 1 and 1000 or a supported keyword',
      props: { fontFamily: 'Roboto', fallbackFontFamily: 'Verdana', fontWeight: '400;}</style>' },
    },
    {
      message: 'EFont webFont.url must be a non-empty string',
      props: { fontFamily: 'Roboto', fallbackFontFamily: 'Verdana', webFont: { format: 'woff2', url: '' } },
    },
  ])('rejects invalid CSS inputs: $message', async ({ message, props }) => {
    await expect(renderFont(props as EFontProps)).rejects.toThrow(message)
  })
})
