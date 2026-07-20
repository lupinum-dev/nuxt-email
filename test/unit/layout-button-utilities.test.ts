import { createTextVNode, Fragment, h } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  convertToPixels,
  parseButtonPadding,
  pixelsToPoints,
  pixelStyle,
} from '../../src/runtime/components/button-padding'
import { computeMsoFontWidthAndSpaceCount } from '../../src/runtime/components/EButton'
import {
  PREVIEW_MAX_LENGTH,
  PREVIEW_WHITESPACE,
  previewText,
  previewWhitespace,
} from '../../src/runtime/components/EPreview'
import { splitTablePadding } from '../../src/runtime/components/table-padding'

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

describe('table padding placement', () => {
  it('moves physical padding to the cell and leaves other styles on the table', () => {
    expect(splitTablePadding({
      'background-color': 'white',
      'padding': '1px 2px',
      'padding-block': '4px',
      'padding-left': '3px',
    })).toEqual({
      tableStyle: {
        backgroundColor: 'white',
        paddingBlock: '4px',
      },
      cellStyle: {
        padding: '1px 2px',
        paddingLeft: '3px',
      },
    })
  })
})

describe('button padding conversion', () => {
  it.each([
    [10, 10],
    ['10px', 10],
    ['2em', 32],
    ['1.5rem', 24],
    ['50%', 300],
    ['0', 0],
  ])('converts %j to pixels', (input, expected) => {
    expect(convertToPixels(input)).toBe(expected)
  })

  it.each([
    ['10px', { paddingTop: 10, paddingRight: 10, paddingBottom: 10, paddingLeft: 10 }],
    ['10px 2em', { paddingTop: 10, paddingRight: 32, paddingBottom: 10, paddingLeft: 32 }],
    ['10px 20px 30px', { paddingTop: 10, paddingRight: 20, paddingBottom: 30, paddingLeft: 20 }],
    ['10px 20px 30px 40px', { paddingTop: 10, paddingRight: 20, paddingBottom: 30, paddingLeft: 40 }],
  ])('expands padding shorthand %j', (padding, expected) => {
    expect(parseButtonPadding({ padding })).toEqual(expected)
  })

  it('applies physical declarations in source order', () => {
    expect(parseButtonPadding({ padding: 10, paddingRight: '1em' })).toEqual({
      paddingTop: 10,
      paddingRight: 16,
      paddingBottom: 10,
      paddingLeft: 10,
    })
    expect(parseButtonPadding({ paddingRight: '1em', padding: '10px' })).toEqual({
      paddingTop: 10,
      paddingRight: 10,
      paddingBottom: 10,
      paddingLeft: 10,
    })
  })

  it('treats numeric and CSS zero consistently', () => {
    expect(parseButtonPadding({ padding: 0 })).toEqual({
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
    })
    expect(parseButtonPadding({ padding: '0px' })).toEqual({
      paddingTop: 0,
      paddingRight: 0,
      paddingBottom: 0,
      paddingLeft: 0,
    })
  })

  it('normalizes Vue kebab-case, string, and array style forms', () => {
    const expected = { paddingTop: 1, paddingRight: 2, paddingBottom: 3, paddingLeft: 4 }

    expect(parseButtonPadding({ 'padding-top': '1px', 'padding-right': '2px', 'padding-bottom': '3px', 'padding-left': '4px' })).toEqual(expected)
    expect(parseButtonPadding('padding:1px 2px 3px 4px')).toEqual(expected)
    expect(parseButtonPadding([{ padding: '1px 2px' }, { paddingBottom: '3px', paddingLeft: '4px' }])).toEqual(expected)
  })

  it.each([
    Number.POSITIVE_INFINITY,
    Number.NaN,
    -1,
    '-1px',
    '15cm',
    'calc(10px + 1em)',
    'invalid',
    '',
  ])('rejects padding that cannot produce safe Outlook spacing: %j', (padding) => {
    expect(() => parseButtonPadding({ padding }))
      .toThrow(/EButton padding/)
  })

  it('converts pixels to points and explicit CSS pixel values', () => {
    expect(pixelsToPoints(10)).toBe(7.5)
    expect(pixelsToPoints(0)).toBe(0)
    expect(pixelsToPoints(Number.NaN)).toBeUndefined()
    expect(pixelStyle(7.5)).toBe('7.5px')
    expect(pixelStyle(0)).toBe(0)
    expect(pixelStyle(undefined)).toBeUndefined()
  })
})

describe('Outlook spacer calculation', () => {
  it.each([
    [0, [0, 0]],
    [Number.MIN_VALUE, [0, 1]],
    [1, [0.5, 1]],
    [4, [2, 1]],
    [10, [5, 1]],
    [11, [2.75, 2]],
    [12, [3, 2]],
    [20, [5, 2]],
  ])('maps %d pixels to the pinned font width and spacer count', (padding, expected) => {
    expect(computeMsoFontWidthAndSpaceCount(padding)).toEqual(expected)
  })

  it('rejects non-finite widths without entering an unbounded calculation', () => {
    expect(() => computeMsoFontWidthAndSpaceCount(Number.POSITIVE_INFINITY))
      .toThrow('EButton padding must resolve to finite pixels; received Infinity')
  })

  it('rejects negative widths', () => {
    expect(() => computeMsoFontWidthAndSpaceCount(-1))
      .toThrow('EButton padding must be a finite non-negative value; received -1')
  })

  it('rejects Outlook spacer output large enough to inflate the email', () => {
    expect(() => computeMsoFontWidthAndSpaceCount(10_001))
      .toThrow('EButton horizontal padding requires 1001 Outlook spacer characters; maximum is 1000')
  })
})
