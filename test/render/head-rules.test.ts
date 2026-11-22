import { describe, expect, it } from 'vitest'
import { createTailwindEngine } from '../../src/compiler/tailwind/index'

describe('per-rule head CSS', () => {
  it('names the classes of each rule in stylesheet order', async () => {
    const engine = await createTailwindEngine()
    const classes = ['p-4', 'sm:p-6', 'hover:bg-blue-700', 'md:hover:underline', 'animate-spin', 'focus:text-red-500']
    const computed = engine.computeStyles(classes)
    expect(computed.headRules.map(rule => rule.classes)).toEqual([
      ['hover:bg-blue-700'],
      ['focus:text-red-500'],
      ['sm:p-6'],
      ['md:hover:underline'],
      ['animate-spin'],
    ])
  })
})
