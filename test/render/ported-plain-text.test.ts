import { describe, it } from 'vitest'
import type { PortedCase } from './ported'
import { expectPortedCase, renderPortedCases } from './ported'

// Plain text of `renderEmail`, derived from the rendered HTML. Expected values are the text
// React Email 6.11.0 produced for the same markup.
const cases: PortedCase[] = [
  {
    name: 'nested-lists',
    body: '<ul><li>One<ul><li>Nested A</li><li>Nested B</li></ul></li><li>Two</li></ul>',
    text: ' * One\n   * Nested A\n   * Nested B\n * Two',
  },
  {
    name: 'ordered-start',
    body: '<ol start="5"><li>One</li><li>Two</li></ol>',
    text: ' 5. One\n 6. Two',
  },
  {
    name: 'blockquote',
    body: '<blockquote>one<br>two</blockquote>',
    text: '> one\n> two',
  },
  {
    name: 'breaks',
    body: 'a<br>b<br><br>c',
    text: 'a\nb\n\nc',
  },
  {
    name: 'tables',
    body: [
      '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>',
      '<table><tr><td><table><tr><td>Col A</td></tr></table></td><td><table><tr><td>Col B</td></tr></table></td></tr></table>',
      '<table data-text-format="dataTable"><tr><td>Ada</td><td>Engineer</td></tr><tr><td>Grace</td><td>Admiral</td></tr></table>',
    ].join('<p></p>'),
    text: 'ABCD\n\n\n\nCol A\n\nCol B\n\n\n\nAda     Engineer\nGrace   Admiral',
  },
  {
    name: 'preformatted',
    script: 'const code = \'line  one\\n  indented\'',
    body: '<pre>{{ code }}</pre>',
    text: 'line  one\n  indented',
  },
  {
    name: 'links',
    body: '<a href="#section">jump</a><p><a href="mailto:x@y.com">mail me</a></p><a>bare</a>',
    text: 'jump\n\nmail me x@y.com\n\nbare',
  },
  {
    name: 'unicode',
    body: '<p>Grüße 🌍 你好 مرحبا 👩🏽‍💻 é é €</p>',
    text: 'Grüße 🌍 你好 مرحبا 👩🏽‍💻 é é €',
  },
].map(entry => ({ ...entry, golden: false }))

const rendered = renderPortedCases('plain-text', cases)

describe('plain text of a rendered email', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('plain-text', entry, rendered)
  })
})
