import { describe, expect, it } from 'vitest'
import { assertSafeEmailAttributes } from '../../src/runtime/components/attributes'
import { mergeEmailStyles, normalizeEmailStyle } from '../../src/runtime/components/style'

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
