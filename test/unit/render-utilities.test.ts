import { describe, expect, it } from 'vitest'
import { assertSafeEmailAttributes } from '../../src/runtime/components/attributes'
import { mergeEmailStyles, normalizeEmailStyle } from '../../src/runtime/components/style'
import { computeTextMargins } from '../../src/runtime/components/text-margins'
import {
  assembleEmailDocument,
  assertCompleteEmailDocument,
  EMAIL_DOCTYPE,
} from '../../src/runtime/render/document'

describe('email document assembly', () => {
  it('adds the configured doctype exactly once', () => {
    expect(assembleEmailDocument('<html></html>')).toBe(`${EMAIL_DOCTYPE}<html></html>`)
    expect(assembleEmailDocument(`  <!DoCtYpE html><html></html>`)).toBe(`${EMAIL_DOCTYPE}<html></html>`)
  })

  it('does not alter doctype-like text inside the document', () => {
    const html = '<html><body><pre>&lt;!DOCTYPE html&gt;</pre></body></html>'
    expect(assembleEmailDocument(html)).toBe(`${EMAIL_DOCTYPE}${html}`)
  })

  it('accepts one complete html document with one body', () => {
    expect(() => assertCompleteEmailDocument(`${EMAIL_DOCTYPE}<html><head></head><body>Safe</body></html>`))
      .not.toThrow()
  })

  it.each([
    '',
    '<p>Body only</p>',
    '<html><head></head></html>',
    '<html><body>One</body><body>Two</body></html>',
    '<html><body>One</body></html><html><body>Two</body></html>',
  ])('rejects an incomplete or ambiguous document root: %j', (html) => {
    expect(() => assertCompleteEmailDocument(`${EMAIL_DOCTYPE}${html}`))
      .toThrow('Email templates must render exactly one <html> root containing exactly one <body>')
  })
})

describe('text margin computation', () => {
  it.each([
    [24, { marginTop: 24, marginBottom: 24, marginLeft: 24, marginRight: 24 }],
    ['24px', { marginTop: '24px', marginBottom: '24px', marginLeft: '24px', marginRight: '24px' }],
    ['1px 2px', { marginTop: '1px', marginBottom: '1px', marginLeft: '2px', marginRight: '2px' }],
    ['1px 2px 3px', { marginTop: '1px', marginBottom: '3px', marginLeft: '2px', marginRight: '2px' }],
    ['1px 2px 3px 4px', { marginTop: '1px', marginBottom: '3px', marginLeft: '4px', marginRight: '2px' }],
  ])('expands margin shorthand %j', (margin, expected) => {
    expect(computeTextMargins({ margin })).toEqual(expected)
  })

  it('applies declarations in insertion order', () => {
    expect(computeTextMargins({ margin: 0, marginBottom: '1rem' })).toEqual({
      marginTop: 0,
      marginBottom: '1rem',
      marginLeft: 0,
      marginRight: 0,
    })
    expect(computeTextMargins({ marginBottom: '1rem', margin: 0 })).toEqual({
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    })
  })

  it('matches React declaration order after expanding shorthand', () => {
    expect(Object.keys(computeTextMargins({ margin: '12px' }))).toEqual([
      'marginTop',
      'marginBottom',
      'marginLeft',
      'marginRight',
    ])
  })

  it('returns undefined sides for unsupported shorthand lengths', () => {
    expect(computeTextMargins({ margin: '1px 2px 3px 4px 5px' })).toEqual({
      marginTop: undefined,
      marginRight: undefined,
      marginBottom: undefined,
      marginLeft: undefined,
    })
  })
})

describe('style merging', () => {
  it('lets object styles override defaults', () => {
    expect(mergeEmailStyles({ color: 'blue', margin: 0 }, { color: 'red' })).toEqual({
      color: 'red',
      margin: 0,
    })
  })

  it('keeps string and array declarations after defaults', () => {
    expect(mergeEmailStyles({ color: 'blue' }, 'color:red')).toEqual([{ color: 'blue' }, 'color:red'])
    expect(mergeEmailStyles({ color: 'blue' }, [{ color: 'red' }, 'margin:0'])).toEqual([
      { color: 'blue' },
      { color: 'red' },
      'margin:0',
    ])
  })

  it('canonicalizes styles only for components that inspect declarations', () => {
    expect(normalizeEmailStyle({ 'margin-inline-start': '10px', '--brand-color': 'red' })).toEqual({
      'marginInlineStart': '10px',
      '--brand-color': 'red',
    })
  })
})

describe('email attribute safety', () => {
  it('allows ordinary and data attributes', () => {
    expect(() => assertSafeEmailAttributes('EText', { 'aria-label': 'message', 'data-id': 'one' })).not.toThrow()
  })

  it('rejects raw content and event handler attributes', () => {
    expect(() => assertSafeEmailAttributes('EText', { innerHTML: '<b>unsafe</b>' }))
      .toThrow('EText does not support unsafe HTML attribute: innerHTML')
    expect(() => assertSafeEmailAttributes('EText', { onclick: 'run()', onmouseover: 'run()' }))
      .toThrow('EText does not support unsafe HTML attributes: onclick, onmouseover')
  })
})
