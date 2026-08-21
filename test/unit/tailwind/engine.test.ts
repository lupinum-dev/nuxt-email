import { describe, expect, it } from 'vitest'
import {
  createTailwindEngine,
  pixelBasedPreset,
} from '../../../src/runtime/tailwind/engine'

function styleOf(
  result: { inlinable: Map<string, Map<string, string>> },
  className: string,
): Record<string, string> | null {
  const map = result.inlinable.get(className)
  return map ? Object.fromEntries(map) : null
}

describe('createTailwindEngine()', () => {
  it('produces per-class kebab-case inline styles with email-safe values', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles([
      'bg-blue-600',
      'rounded-full',
      'w-full',
      'text-center',
    ])

    // oklch -> rgb, calc(infinity*1px) -> 9999px, var() resolution.
    expect(styleOf(result, 'bg-blue-600')).toEqual({
      'background-color': 'rgb(21,93,252)',
    })
    expect(styleOf(result, 'rounded-full')).toEqual({
      'border-radius': '9999px',
    })
    expect(styleOf(result, 'w-full')).toEqual({ width: '100%' })
    expect(styleOf(result, 'text-center')).toEqual({ 'text-align': 'center' })
  })

  it('separates non-inlinable (media/pseudo) rules and sanitizes their classes', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles([
      'bg-blue-600',
      'sm:px-4',
      'hover:underline',
      'unknown',
    ])

    // Media/pseudo classes never appear as inline styles.
    expect(result.inlinable.has('sm:px-4')).toBe(false)
    expect(result.inlinable.has('hover:underline')).toBe(false)

    // They are unnested, range-downleveled, !important-ed, with sanitized selectors.
    expect(result.nonInlinableCss).toBe(
      '@media (hover:hover){.hover_underline:hover{text-decoration-line:underline!important}}'
      + '@media (min-width:40rem){.sm_px-4{padding-right:1rem!important;padding-left:1rem!important}}',
    )
    expect(result.nonInlinableCss).not.toContain('&')
  })

  it('maps residual classes: non-inlinable -> sanitized, unknown -> identity, inlinable -> dropped', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles([
      'bg-blue-600', // inlinable only -> dropped
      'sm:px-4', // non-inlinable -> sanitized
      'hover:underline', // non-inlinable -> sanitized
      'unknown', // no rule -> identity
    ])

    expect(Object.fromEntries(result.residualClassMap)).toEqual({
      'sm:px-4': 'sm_px-4',
      'hover:underline': 'hover_underline',
      'unknown': 'unknown',
    })
    expect(result.residualClassMap.has('bg-blue-600')).toBe(false)
  })

  it('returns empty nonInlinableCss when there are no media/pseudo rules', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles(['w-full', 'text-center'])
    expect(result.nonInlinableCss).toBe('')
  })

  it('the inline style Map preserves order for author-wins merging', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles(['px-2'])
    const px2 = result.inlinable.get('px-2')!

    // Ordered longhand split from padding-inline (source order preserved).
    expect([...px2.entries()]).toEqual([
      ['padding-right', '0.5rem'],
      ['padding-left', '0.5rem'],
    ])

    // A consumer replicates React's `{ ...tw, ...author }` author-wins merge:
    const merged = new Map(px2)
    for (const [k, v] of new Map([['padding-left', '10px']])) merged.set(k, v)
    expect([...merged.entries()]).toEqual([
      ['padding-right', '0.5rem'],
      ['padding-left', '10px'], // author overrides in place, keeps position
    ])
  })

  it('applies a pixel-based preset via config.presets', async () => {
    const engine = await createTailwindEngine({
      config: { presets: [pixelBasedPreset] },
    })
    const result = engine.computeStyles(['p-4', 'px-2'])

    expect(styleOf(result, 'p-4')).toEqual({ padding: '16px' })
    expect(styleOf(result, 'px-2')).toEqual({
      'padding-right': '8px',
      'padding-left': '8px',
    })
  })

  it('accepts custom theme CSS via the theme option', async () => {
    const engine = await createTailwindEngine({
      theme: '@theme { --color-brand: #123456; }',
    })
    const result = engine.computeStyles(['bg-brand'])
    expect(styleOf(result, 'bg-brand')).toEqual({
      'background-color': 'rgb(18,52,86)',
    })
  })

  it('emits only keyframes referenced by the current render', async () => {
    const engine = await createTailwindEngine({})

    engine.computeStyles(['animate-spin', 'animate-pulse'])
    const result = engine.computeStyles(['animate-spin'])

    expect(result.nonInlinableCss).toBe(
      '@keyframes spin{to{transform:rotate(360deg)}}',
    )
    expect(result.nonInlinableCss).not.toContain('@keyframes pulse')
    expect(result.nonInlinableClassNames).toEqual(['animate-spin'])
  })

  it('flattens Tailwind v4 stacked hover and responsive variants', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles(['hover:underline', 'sm:hover:underline'])

    expect(result.nonInlinableCss).toBe(
      '@media (hover:hover){.hover_underline:hover{text-decoration-line:underline!important}}'
      + '@media (min-width:40rem){@media (hover:hover){.sm_hover_underline:hover{text-decoration-line:underline!important}}}',
    )
    expect(result.nonInlinableCss).not.toContain('&')
  })

  it('returns identical CSS across repeated renders', async () => {
    const engine = await createTailwindEngine({})
    const classes = ['animate-spin', 'hover:underline', 'sm:px-4']

    expect(engine.computeStyles(classes).nonInlinableCss).toBe(
      engine.computeStyles(classes).nonInlinableCss,
    )
  })
})
