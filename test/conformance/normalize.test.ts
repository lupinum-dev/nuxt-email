import { describe, expect, it } from 'vitest'
import { normalizeEmailHtml } from './normalize'

describe('email HTML normalization', () => {
  it('removes only the proven React streaming boundary markers', () => {
    const input = '<!--$--><!--html--><p>Safe</p><!--head--><!--body--><!--/$--><!--meaningful-->'

    expect(normalizeEmailHtml(input)).toBe('<p>Safe</p><!--meaningful-->')
  })

  it('normalizes attribute names, order, terminal style semicolons, and void syntax', () => {
    const input = '<img width="10" style="color:red;" cellSpacing="0" alt="Logo" cellPadding="0" />'

    expect(normalizeEmailHtml(input)).toBe('<img alt="Logo" cellpadding="0" cellspacing="0" style="color:red" width="10">')
  })

  it('preserves MSO conditionals byte-for-byte', () => {
    const input = '<!--[if mso]><i style="mso-font-width:500%" hidden>&#8202;</i><![endif]-->'

    expect(normalizeEmailHtml(input)).toBe(input)
  })

  it('preserves text, URLs, CSS values, and child order', () => {
    const input = '<span style="content:\'a;b\';color:red" data-value="x > y">first cellSpacing=</span><a href="https://example.com/?cellPadding=0&amp;value=style=&quot;x;&quot;">second</a>'
    const expected = '<span data-value="x > y" style="content:\'a;b\';color:red">first cellSpacing=</span><a href="https://example.com/?cellPadding=0&amp;value=style=&quot;x;&quot;">second</a>'

    expect(normalizeEmailHtml(input)).toBe(expected)
  })
})
