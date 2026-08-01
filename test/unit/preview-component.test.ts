import { createTextVNode, Fragment, h } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  PREVIEW_MAX_LENGTH,
  PREVIEW_WHITESPACE,
  previewText,
  previewWhitespace,
} from '../../src/runtime/components/EPreview'

describe('preview text', () => {
  it('joins Vue text fragments and truncates to 200 UTF-16 code units', () => {
    const text = previewText([
      createTextVNode('Hello '),
      h(Fragment, [createTextVNode('Ada'), createTextVNode('!')]),
      'x'.repeat(300),
    ])

    expect(text).toHaveLength(PREVIEW_MAX_LENGTH)
    expect(text).toBe(`Hello Ada!${'x'.repeat(190)}`)
  })

  it('rejects element content instead of silently deriving text', () => {
    expect(() => previewText([h('strong', 'Not plain text')]))
      .toThrow('EPreview default slot must contain text only')
  })

  it('does not split an emoji at the preview boundary', () => {
    const safeBoundary = previewText(`${'x'.repeat(198)}😀`)
    const splitBoundary = previewText([`${'x'.repeat(199)}\uD83D`, '\uDE00tail'])

    expect(safeBoundary).toBe(`${'x'.repeat(198)}😀`)
    expect(safeBoundary).toHaveLength(200)
    expect(splitBoundary).toBe('x'.repeat(199))
    expect(splitBoundary).not.toContain('\uFFFD')
  })

  it('matches the exact filler boundaries', () => {
    expect(previewWhitespace('')).toBe(PREVIEW_WHITESPACE.repeat(200))
    expect(previewWhitespace('x'.repeat(199))).toBe(PREVIEW_WHITESPACE)
    expect(previewWhitespace('x'.repeat(200))).toBeUndefined()
    expect(previewWhitespace('x'.repeat(201))).toBeUndefined()
  })
})
