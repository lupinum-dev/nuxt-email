import { expect, test } from 'vitest'
import { sanitizeClassName } from '../../../src/runtime/tailwind/engine/compatibility/sanitize-class-name'

test('sanitizeClassName', () => {
  expect(sanitizeClassName('min-height-[calc(25px+100%-20%*2/4)]')).toBe(
    'min-height-calc25pxplus100pc-20pc_2_4',
  )
})
