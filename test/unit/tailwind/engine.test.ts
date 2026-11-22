import { describe, expect, it } from 'vitest'
import { type ComputedStyles, createTailwindEngine } from '../../../src/compiler/tailwind'

function styleOf(
  result: { inlinable: Map<string, Map<string, string>> },
  className: string,
): Record<string, string> | null {
  const map = result.inlinable.get(className)
  return map ? Object.fromEntries(map) : null
}

function headCss(result: ComputedStyles): string {
  return result.headRules.map(rule => rule.css).join('')
}

describe('createTailwindEngine()', () => {
  it.each([['@sm:bg-red-500'], ['@container', '@sm:bg-red-500']])('rejects unsupported container conditions for %j', async (...classes) => {
    const engine = await createTailwindEngine({})
    expect(() => engine.computeStyles(classes)).toThrow('@container rules are not supported')
  })

  it.each(['scope (.card)', 'container (min-width: 10px)'])('rejects custom CSS that wraps a class in @%s', async (atRule) => {
    const engine = await createTailwindEngine({ css: `@${atRule} { .brand { color: red; } }` })
    expect(() => engine.computeStyles(['brand'])).toThrow(`@${atRule.split(' ')[0]} rules are not supported`)
  })

  it('keeps the condition of @supports as written', async () => {
    const engine = await createTailwindEngine({})
    expect(headCss(engine.computeStyles(['supports-[display:grid]:grid'])))
      .toBe('@supports (display:grid){.supports-display_grid_grid{display:grid!important}}')
  })

  it.each([
    { utility: '*:bg-red-500', declaration: 'background-color:#fb2c36!important' },
    { utility: '**:text-blue-500', declaration: 'color:#2b7fff!important' },
  ])('preserves the actual owner of child variant $utility', async ({ utility, declaration }) => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles([utility])
    expect(result.inlinable.has(utility)).toBe(false)
    expect(headCss(result)).toContain(declaration)
    const residual = result.residualClassMap.get(utility)
    expect(residual).toBe(utility.startsWith('**') ? '___text-blue-500' : '__bg-red-500')
    expect(headCss(result)).toContain(`.${residual}${utility.startsWith('**') ? ' *' : '>*'}{`)
  })

  it('produces per-class kebab-case inline styles with email-safe values', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles([
      'bg-blue-600',
      'rounded-full',
      'w-full',
      'text-center',
    ])

    // oklch -> hex, calc(infinity*1px) -> 9999px.
    expect(styleOf(result, 'bg-blue-600')).toEqual({
      'background-color': '#155dfc',
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

    // They are unnested, written with min-/max- media features, !important-ed, with sanitized selectors.
    expect(headCss(result)).toBe(
      '@media (hover:hover){.hover_underline:hover{text-decoration-line:underline!important}}'
      + '@media (min-width:640px){.sm_px-4{padding-left:16px!important;padding-right:16px!important}}',
    )
    expect(headCss(result)).not.toContain('&')
  })

  it('emits selector-list rules once in stylesheet order', async () => {
    const engine = await createTailwindEngine({
      css: '.a:hover, .b:hover { color: red } .b:focus { color: blue } .a:focus { color: green }',
    })

    expect(headCss(engine.computeStyles(['a', 'b']))).toBe(
      '.a:hover,.b:hover{color:red!important}'
      + '.b:focus{color:#00f!important}'
      + '.a:focus{color:green!important}',
    )
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

  it('returns no head rules when there are no media/pseudo rules', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles(['w-full', 'text-center'])
    expect(headCss(result)).toBe('')
  })

  it('the inline style Map preserves order for author-wins merging', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles(['px-2'])
    const px2 = result.inlinable.get('px-2')!

    // Ordered longhands split from padding-inline.
    expect([...px2.entries()]).toEqual([
      ['padding-left', '8px'],
      ['padding-right', '8px'],
    ])

    // A consumer replicates React's `{ ...tw, ...author }` author-wins merge:
    const merged = new Map(px2)
    for (const [k, v] of new Map([['padding-left', '10px']])) merged.set(k, v)
    expect([...merged.entries()]).toEqual([
      ['padding-left', '10px'], // author overrides in place, keeps position
      ['padding-right', '8px'],
    ])
  })

  it('accepts custom theme CSS', async () => {
    const engine = await createTailwindEngine({
      css: '@theme { --color-brand: #123456; }',
    })
    const result = engine.computeStyles(['bg-brand'])
    expect(styleOf(result, 'bg-brand')).toEqual({
      'background-color': '#123456',
    })
  })

  // Lightning CSS writes legacy colour syntax but stores numbers as 32-bit floats and maps
  // out-of-gamut colours its own way; both would change what Chrome renders.
  it.each([
    ['text-blue-500/75', 'color', 'rgba(43,127,255,.75)'],
    ['bg-[#f00a]', 'background-color', 'rgba(255,0,0,.667)'],
    ['text-[rgb(10_20_30)]', 'color', '#0a141e'],
    ['text-sm', 'line-height', '1.4285714285714286'],
    ['w-1/3', 'width', '33.33333333333333%'],
  ])('writes %s as email-safe %s: %s', async (utility, property, value) => {
    const engine = await createTailwindEngine({})
    expect(styleOf(engine.computeStyles([utility]), utility)?.[property]).toBe(value)
  })

  it('drops resolved --tw-* declarations and the head rules they leave empty', async () => {
    const engine = await createTailwindEngine({})
    expect(headCss(engine.computeStyles(['bg-linear-to-r', 'print:border-solid']))).toBe(
      '@media print{.print_border-solid{border-style:solid!important}}',
    )
  })

  it('emits only keyframes referenced by the current render', async () => {
    const engine = await createTailwindEngine({})

    engine.computeStyles(['animate-spin', 'animate-pulse'])
    const result = engine.computeStyles(['animate-spin'])

    expect(headCss(result)).toBe(
      '@keyframes spin{to{transform:rotate(360deg)}}',
    )
    expect(headCss(result)).not.toContain('@keyframes pulse')
    expect([...result.headClasses]).toEqual(['animate-spin'])
  })

  it('lists each animation class needing head CSS once', async () => {
    const engine = await createTailwindEngine({})

    expect([...engine.computeStyles(['animate-spin', 'animate-spin']).headClasses])
      .toEqual(['animate-spin'])
  })

  it('flattens Tailwind v4 stacked hover and responsive variants', async () => {
    const engine = await createTailwindEngine({})
    const result = engine.computeStyles(['hover:underline', 'sm:hover:underline'])

    expect(headCss(result)).toBe(
      '@media (hover:hover){.hover_underline:hover{text-decoration-line:underline!important}}'
      + '@media (min-width:640px) and (hover:hover){.sm_hover_underline:hover{text-decoration-line:underline!important}}',
    )
    expect(headCss(result)).not.toContain('&')
  })

  it('returns identical CSS across repeated renders', async () => {
    const engine = await createTailwindEngine({})
    const classes = ['animate-spin', 'hover:underline', 'sm:px-4']

    expect(headCss(engine.computeStyles(classes))).toBe(
      headCss(engine.computeStyles(classes)),
    )
  })
})
