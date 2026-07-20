import { describe, expect, it } from 'vitest'
import { renderPlainText } from '../../src/runtime/render/plain-text'

describe('plain-text rendering', () => {
  const completeHtml = [
    '<!DOCTYPE html><html>',
    '<head><title>Internal title</title><meta name="secret" content="hidden"><style>body{color:red}</style></head>',
    '<body>',
    '<h1>Hallo &lt;Ada&gt;</h1>',
    '<p>Dein Konto ist bereit.</p>',
    '<a href="https://example.com/?x=1&amp;y=2">Öffnen</a>',
    '<img alt="Hidden logo" src="https://example.com/logo.png">',
    '<span data-skip-in-text="true">Preview filler must stay hidden</span>',
    '<hr>',
    '</body></html>',
  ].join('')

  it('matches the supported headings, paragraphs, links, images, rules, and head behavior', () => {
    expect(renderPlainText(completeHtml)).toBe([
      'HALLO <ADA>',
      '',
      'Dein Konto ist bereit.',
      '',
      'Öffnen https://example.com/?x=1&y=2',
      '',
      '----------------------------------------',
    ].join('\n'))
  })

  it('does not repeat a link URL when it is already the visible text', () => {
    expect(renderPlainText('<a href="https://example.com">https://example.com</a>'))
      .toBe('https://example.com')
  })

  it('decodes entities, preserves Unicode, and does not wrap long lines', () => {
    const longText = `Grüß dich & welcome ${'x'.repeat(160)}`
    const html = `<p>Grüß dich &amp; welcome ${'x'.repeat(160)}</p>`

    expect(renderPlainText(html)).toBe(longText)
  })

  it('is deterministic for empty and repeated conversions', () => {
    expect(renderPlainText('')).toBe('')
    expect(renderPlainText(completeHtml)).toBe(renderPlainText(completeHtml))
  })
})
