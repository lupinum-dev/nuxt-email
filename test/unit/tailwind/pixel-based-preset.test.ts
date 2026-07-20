import { describe, expect, it } from 'vitest'
import { pixelBasedPreset } from '../../../src/runtime/tailwind/engine/pixel-based-preset'

describe('pixelBasedPreset', () => {
  it('redefines the spacing scale in pixels', () => {
    expect(pixelBasedPreset.theme?.extend?.spacing).toMatchObject({
      px: '1px',
      0: '0',
      1: '4px',
      4: '16px',
      96: '384px',
    })
  })

  it('redefines the fontSize scale in pixels with line heights', () => {
    expect(pixelBasedPreset.theme?.extend?.fontSize).toMatchObject({
      'base': ['16px', { lineHeight: '24px' }],
      '5xl': ['48px', { lineHeight: '1' }],
    })
  })
})
