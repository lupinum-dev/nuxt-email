import type { Component } from 'vue'
import oracle from './oracle/react-email-6.9.0.json'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EMarkdown } from '../../src/runtime/components/EMarkdown'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { normalizeEmailHtml } from './normalize'

function markdownFixture(
  props: Record<string, unknown> = {},
  slotSource?: string,
): Component {
  return defineComponent({
    name: 'MarkdownFixture',
    setup() {
      return () => h(EMarkdown, props, slotSource === undefined
        ? undefined
        : { default: () => slotSource })
    },
  })
}

// EMarkdown drops React Email's data-id="react-email-markdown" container marker (the same
// no-data-id divergence already applied to EColumn). The shared normalizer does not remove
// it, so strip it from the oracle before the normalized full-document comparison.
function stripMarkdownDataId(html: string): string {
  return html.replace(' data-id="react-email-markdown"', '')
}

const markdownDocument = [
  '# Heading One',
  '',
  'A paragraph with **bold** and *italic* text and a [link](https://example.com).',
  '',
  '- First item',
  '- Second item',
  '- Third item',
  '',
  '> A quoted line of context.',
  '',
  '```js',
  'const total = 1 + 2;',
  '```',
  '',
  '---',
  '',
  '![Logo alt](https://example.com/logo.png)',
].join('\n')

const markdownCustomDocument = [
  '# Styled heading',
  '',
  'Body text with **strong** emphasis.',
].join('\n')

const markdownEscapingDocument = [
  '[quoted "link" text](https://example.com/?q="a"&b=c "A \\"quoted\\" title")',
  '',
  '![alt "with" quotes](https://example.com/i.png "image \\"title\\"")',
].join('\n')

const markdownNestedDocument = [
  '- Item one',
  '  - Nested one',
  '  - Nested two',
  '- Item two',
  '',
  '1. Ordered one',
  '',
  '2. Ordered two (loose)',
].join('\n')

describe('EMarkdown', () => {
  it('matches the full-document React oracle from a source prop', {
    tags: ['conformance:markdown-document'],
  }, async () => {
    const html = await renderComponentToHtml(markdownFixture({ source: markdownDocument }))

    expect(normalizeEmailHtml(html)).toBe(
      normalizeEmailHtml(stripMarkdownDataId(oracle.cases['markdown-document'].html)),
    )
    expect(html).not.toContain('data-id')
    expect(html).toContain('target="_blank"')
  })

  it('extracts markdown from the default slot deterministically', async () => {
    const fromSlot = await renderComponentToHtml(markdownFixture({}, markdownDocument))
    const fromProp = await renderComponentToHtml(markdownFixture({ source: markdownDocument }))

    expect(fromSlot).toBe(fromProp)
    expect(normalizeEmailHtml(fromSlot)).toBe(
      normalizeEmailHtml(stripMarkdownDataId(oracle.cases['markdown-document'].html)),
    )
  })

  it('merges custom element styles over defaults and applies container styles', {
    tags: ['conformance:markdown-custom-styles'],
  }, async () => {
    const html = await renderComponentToHtml(markdownFixture({
      source: markdownCustomDocument,
      markdownCustomStyles: { h1: { color: 'red' }, bold: { padding: '1px 2px' } },
      markdownContainerStyles: { padding: '8px' },
    }))

    expect(normalizeEmailHtml(html)).toBe(
      normalizeEmailHtml(stripMarkdownDataId(oracle.cases['markdown-custom-styles'].html)),
    )
    expect(html).toContain('<h1 style="color:red">Styled heading</h1>')
    expect(html).toContain('<strong style="padding:1px 2px">strong</strong>')
  })

  it('forwards fall-through attributes and applies react-dom px units to numeric container styles', {
    tags: ['conformance:markdown-container-and-attrs'],
  }, async () => {
    const html = await renderComponentToHtml(markdownFixture({
      class: 'wrap',
      id: 'note',
      dir: 'rtl',
      source: markdownCustomDocument,
      markdownContainerStyles: { padding: 8, paddingTop: 10, marginBottom: 20, lineHeight: 2, opacity: 0, zIndex: 5, height: 0 },
    }))

    expect(normalizeEmailHtml(html)).toBe(
      normalizeEmailHtml(stripMarkdownDataId(oracle.cases['markdown-container-and-attrs'].html)),
    )
    // Fall-through attributes forwarded onto the container div.
    expect(html).toContain('class="wrap"')
    expect(html).toContain('id="note"')
    expect(html).toContain('dir="rtl"')
    // Non-unitless numerics gain px; unitless (line-height/opacity/z-index) and zero stay bare.
    expect(html).toContain('padding:8px')
    expect(html).toContain('padding-top:10px')
    expect(html).toContain('margin-bottom:20px')
    expect(html).toContain('line-height:2;')
    expect(html).toContain('opacity:0;')
    expect(html).toContain('z-index:5;')
    expect(html).toContain('height:0;')
    expect(html).not.toContain('height:0px')
  })

  it('escapes double quotes in link/image href and title attributes', {
    tags: ['conformance:markdown-links-escaping'],
  }, async () => {
    const html = await renderComponentToHtml(markdownFixture({ source: markdownEscapingDocument }))

    expect(normalizeEmailHtml(html)).toBe(
      normalizeEmailHtml(stripMarkdownDataId(oracle.cases['markdown-links-escaping'].html)),
    )
    // Exact-byte fragments: the escaped attribute serialization must match React verbatim.
    expect(html).toContain('<a href="https://example.com/?q=&quot;a&quot;&b=c" target="_blank" title="A &quot;quoted&quot; title" style="color:#007bff;text-decoration:underline;background-color:transparent">quoted &quot;link&quot; text</a>')
    expect(html).toContain('<img src="https://example.com/i.png" alt="alt &quot;with&quot; quotes" title="image &quot;title&quot;">')
  })

  it('matches nested and loose list nesting from the React oracle', {
    tags: ['conformance:markdown-nested-lists'],
  }, async () => {
    const html = await renderComponentToHtml(markdownFixture({ source: markdownNestedDocument }))

    expect(normalizeEmailHtml(html)).toBe(
      normalizeEmailHtml(stripMarkdownDataId(oracle.cases['markdown-nested-lists'].html)),
    )
  })

  it('rejects element children in the default slot', async () => {
    const fixture = defineComponent({
      name: 'MarkdownElementSlotFixture',
      setup() {
        return () => h(EMarkdown, {}, { default: () => h('strong', 'nested') })
      },
    })

    await expect(renderComponentToHtml(fixture))
      .rejects.toThrow('EMarkdown default slot must contain text only')
  })

  it.each([
    '<script>alert(1)</script>',
    '<img src=x onerror="alert(1)">',
    '<!-- hidden raw HTML -->',
  ])('rejects raw HTML in Markdown source: %s', async (source) => {
    await expect(renderComponentToHtml(markdownFixture({ source })))
      .rejects.toThrow('EMarkdown does not support raw HTML')
  })

  it.each([
    '[x](javascript:alert(1))',
    '[x](javascript&#58;alert(1))',
    '[x](&#106;avascript:alert(1))',
    '[x](java&#10;script:alert(1))',
    '[x](vbscript:msgbox(1))',
    '![x](data:text/html;base64,PHNjcmlwdD4=)',
  ])('rejects unsafe Markdown URL schemes: %s', async (source) => {
    await expect(renderComponentToHtml(markdownFixture({ source })))
      .rejects.toThrow(/EMarkdown (?:image|link) URL uses an unsupported scheme/)
  })

  it('escapes HTML-looking code spans and fences instead of activating them', async () => {
    const source = [
      '`<img src=x onerror=alert(1)>`',
      '',
      '```html',
      '<script>alert(1)</script>',
      '```',
    ].join('\n')

    const html = await renderComponentToHtml(markdownFixture({ source }))

    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img src=x')
  })

  it('keeps common email-safe absolute and relative Markdown destinations', async () => {
    const source = [
      '[Web](https://example.com)',
      '[Email](mailto:hello@example.com)',
      '[Phone](tel:+431234)',
      '[Relative](/account)',
      '![Inline attachment](cid:logo)',
    ].join(' ')

    const html = await renderComponentToHtml(markdownFixture({ source }))

    expect(html).toContain('href="https://example.com"')
    expect(html).toContain('href="mailto:hello@example.com"')
    expect(html).toContain('href="tel:+431234"')
    expect(html).toContain('href="/account"')
    expect(html).toContain('src="cid:logo"')
  })
})
