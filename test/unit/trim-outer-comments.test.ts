import { describe, expect, it } from 'vitest'
import { trimOuterComments } from '../../src/runtime/render-email'

const document = '<html><body>Hi</body></html>'

describe('trimOuterComments()', () => {
  it.each([
    ['fragment markers and whitespace', `<!--[-->\n ${document} <!--]--><!---->\n`, document],
    ['nothing around the document', document, document],
    ['text before the document', `x${document}`, `x${document}`],
    ['an unclosed comment after the document', `${document}<!-- open`, `${document}<!-- open`],
    ['a comment too short to be complete', `${document}<!-->`, `${document}<!-->`],
    ['a comment inside the document', '<html><body><!--v-if--></body></html><!--]-->', '<html><body><!--v-if--></body></html>'],
    ['a closing marker without an opening', `${document}-->`, `${document}-->`],
  ])('trims only complete outer comments: %s', (_case, html, expected) => {
    expect(trimOuterComments(html)).toBe(expected)
  })

  it('trims 50,000 empty comments on each side in linear time', () => {
    const comments = '<!---->'.repeat(50_000)
    const start = performance.now()
    expect(trimOuterComments(`${comments}${document}${comments}`)).toBe(document)
    expect(performance.now() - start).toBeLessThan(1_000)
  })

  // A regular expression with nested quantifiers did not finish within 100 s on 1,000 repetitions (CodeQL).
  it('stays linear on 50,000 repetitions of --><!-- after the document', () => {
    const html = `${document}x<!--${'--><!--'.repeat(50_000)}`
    const start = performance.now()
    expect(trimOuterComments(html)).toBe(html)
    expect(performance.now() - start).toBeLessThan(1_000)
  })
})
