import { generate, parse, type StyleSheet } from 'css-tree'
import { describe, expect, it } from 'vitest'
import { downlevelForEmailClients } from '../../../src/runtime/tailwind/engine/css/downlevel-for-email-clients'

function downlevel(css: string): string {
  const styleSheet = parse(css) as StyleSheet
  downlevelForEmailClients(styleSheet)
  return generate(styleSheet)
}

describe('downlevelForEmailClients()', () => {
  describe('media range syntax', () => {
    it.each([
      ['width>=40rem', 'min-width:40rem'],
      ['width>40rem', 'min-width:40rem'],
      ['width<=40rem', 'max-width:40rem'],
      ['width<40rem', 'max-width:40rem'],
    ])('converts %s to %s', (input, output) => {
      expect(downlevel(`@media (${input}){.a{color:red}}`)).toBe(
        `@media (${output}){.a{color:red}}`,
      )
    })

    it('does not affect non-range media queries', () => {
      expect(
        downlevel('@media (prefers-color-scheme:dark){.dark{color:white}}'),
      ).toBe('@media (prefers-color-scheme:dark){.dark{color:white}}')
    })
  })

  it('preserves ordinary rules and an empty stylesheet', () => {
    expect(downlevel('.bg-red{background-color:red}')).toBe(
      '.bg-red{background-color:red}',
    )
    expect(downlevel('')).toBe('')
  })

  it('flattens multiple conditional rules owned by one selector', () => {
    const result = downlevel(
      '.multi{@media (width>=40rem){color:red!important}'
      + '@media (width>=48rem){color:blue!important}}',
    )

    expect(result).toBe(
      '@media (min-width:40rem){.multi{color:red!important}}'
      + '@media (min-width:48rem){.multi{color:blue!important}}',
    )
  })

  it('preserves mixed declarations and nested rules in source order', () => {
    const result = downlevel(
      '.a,.b{color:red;@media (width>=40rem){padding:1rem;'
      + '@supports (display:grid){&:hover,&:focus{display:grid}}'
      + 'margin:2rem}background:blue}',
    )

    expect(result).toBe(
      '.a,.b{color:red}'
      + '@media (min-width:40rem){.a,.b{padding:1rem}}'
      + '@media (min-width:40rem){@supports (display:grid){'
      + '.a:hover,.a:focus,.b:hover,.b:focus{display:grid}}}'
      + '@media (min-width:40rem){.a,.b{margin:2rem}}'
      + '.a,.b{background:blue}',
    )
  })

  it('recursively flattens stacked selectors and conditional at-rules', () => {
    const result = downlevel(
      '@media (width>=40rem){@supports (display:grid){'
      + '.a{& .b,&>.c{display:grid}}}}',
    )

    expect(result).toBe(
      '@media (min-width:40rem){@supports (display:grid){'
      + '.a .b,.a>.c{display:grid}}}',
    )
    expect(result).not.toContain('&')
  })

  it('fails rather than preserving an unparsed nested selector', () => {
    expect(() => downlevel('.a,.b{.child{color:red}}')).toThrow(
      'an unparsed nested CSS shape was encountered',
    )
  })

  it('fails explicitly for an unsupported nested at-rule', () => {
    expect(() => downlevel('.a{@container (width>1px){color:red}}')).toThrow(
      'nested @container rules are not supported',
    )
  })

  it('is deterministic across repeated transforms', () => {
    const input = '.a{@media (width>=40rem){&:hover{color:red}}}'
    expect(downlevel(input)).toBe(downlevel(input))
  })
})
