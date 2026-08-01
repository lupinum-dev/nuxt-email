import { describe, expect, it } from 'vitest'
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
    '<html></body><body></html>',
    '<html><p>Outside body</p><body>Inside</body></html>',
    '<html><body>Inside</body><p>Outside body</p></html>',
    '<p>Outside root</p><html><body>Inside</body></html>',
    '<html><body>Inside</body></html><p>Outside root</p>',
  ])('rejects an incomplete or ambiguous document root: %j', (html) => {
    expect(() => assertCompleteEmailDocument(`${EMAIL_DOCTYPE}${html}`))
      .toThrow('Email templates must render exactly one <html> root containing exactly one <body>')
  })
})
