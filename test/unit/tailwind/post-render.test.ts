import type { ComputedStyles, TailwindEngine } from '../../../src/runtime/tailwind/engine'
import type { TailwindRegion } from '../../../src/runtime/tailwind/nested'
import { describe, expect, it, vi } from 'vitest'
import { applyTailwindPostRender } from '../../../src/runtime/tailwind/post-render'

describe('applyTailwindPostRender()', () => {
  it('computes the complete region styles once', () => {
    const computed: ComputedStyles = {
      inlinable: new Map([['p-4', new Map([['padding', '1rem']])]]),
      nonInlinableCss: '',
      nonInlinableClassNames: [],
      residualClassMap: new Map(),
    }
    const computeStyles = vi.fn(() => computed)
    const region: TailwindRegion = {
      id: 'test',
      engine: { computeStyles } satisfies TailwindEngine,
      classNames: [],
      placeholder: '/*placeholder*/',
      startMarker: 'start',
      endMarker: 'end',
    }
    const html = '<!--start--><html><head><style>/*placeholder*/</style></head>'
      + '<body><div class="p-4">x</div></body></html><!--end-->'

    expect(applyTailwindPostRender(html, [region])).toContain(
      '<div style="padding:1rem;">x</div>',
    )
    expect(computeStyles).toHaveBeenCalledOnce()
    expect(computeStyles).toHaveBeenCalledWith(['p-4'])
  })
})
