import { describe, expect, it } from 'vitest'
import { computeTextMargins } from '../../src/runtime/components/EText.margins'

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
