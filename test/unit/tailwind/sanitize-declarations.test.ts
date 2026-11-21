import { generate, parse } from 'css-tree'
import { describe, expect, it, test } from 'vitest'
import { sanitizeDeclarations } from '../../../src/compiler/tailwind/css/sanitize-declarations'

describe('sanitizeDeclarations', () => {
  it('converts border-radius:calc(Infinity * 1px) to border-radius:9999px', () => {
    let root = parse(`.rounded-full {
  border-radius: calc(Infinity * 1px);
}
`)
    sanitizeDeclarations(root)
    expect(generate(root)).toBe('.rounded-full{border-radius:9999px}')

    root = parse(`.rounded-full {
  border-radius: calc(infinity * 1px);
}
`)
    sanitizeDeclarations(root)
    expect(generate(root)).toBe('.rounded-full{border-radius:9999px}')

    root = parse(`.rounded-full {
  border-radius: calc(infinity*1px);
}
`)
    sanitizeDeclarations(root)
    expect(generate(root)).toBe('.rounded-full{border-radius:9999px}')

    root = parse(`.rounded-full {
  border-radius: calc(Infinity*1px);
}
`)
    sanitizeDeclarations(root)
    expect(generate(root)).toBe('.rounded-full{border-radius:9999px}')
  })

  it('converts calc(infinity * 1px) for corner and logical border-radius longhands', () => {
    let root = parse(`.rounded-tl-full {
  border-top-left-radius: calc(infinity * 1px);
}
`)
    sanitizeDeclarations(root)
    expect(generate(root)).toBe(
      '.rounded-tl-full{border-top-left-radius:9999px}',
    )

    root = parse(`.rounded-e-full {
  border-start-end-radius: calc(infinity * 1px);
  border-end-end-radius: calc(infinity * 1px);
}
`)
    sanitizeDeclarations(root)
    expect(generate(root)).toBe(
      '.rounded-e-full{border-start-end-radius:9999px;border-end-end-radius:9999px}',
    )
  })

  test('oklch to rgb conversion', () => {
    let stylesheet = parse('div { color: oklch(90.5% 0.2 180); }')
    sanitizeDeclarations(stylesheet)
    expect(
      generate(stylesheet),
      'conversion without alpha',
    ).toMatchInlineSnapshot(`"div{color:rgb(0,255,229)}"`)

    stylesheet = parse('div { color: oklch(96.6% 0.147 107 / 80%); }')
    sanitizeDeclarations(stylesheet)
    expect(generate(stylesheet), 'conversion with alpha').toMatchInlineSnapshot(
      `"div{color:rgb(255,251,126,0.8)}"`,
    )

    stylesheet = parse('div { color: oklch(96.6% 0.147 107deg / 80%); }')
    sanitizeDeclarations(stylesheet)
    expect(
      generate(stylesheet),
      'conversion with deg unit',
    ).toMatchInlineSnapshot(`"div{color:rgb(255,251,126,0.8)}"`)

    stylesheet = parse('div { color: oklch(92.6% 0.0546 218 / 50%); }')
    sanitizeDeclarations(stylesheet)
    expect(generate(stylesheet)).toMatchInlineSnapshot(
      `"div{color:rgb(191,240,255,0.5)}"`,
    )

    stylesheet = parse('div { color: oklch(88.3% 0.102 329); }')
    sanitizeDeclarations(stylesheet)
    expect(generate(stylesheet)).toMatchInlineSnapshot(
      `"div{color:rgb(255,193,250)}"`,
    )

    stylesheet = parse('div { color: oklch(69.3% 0.206 42.8); }')
    sanitizeDeclarations(stylesheet)
    expect(generate(stylesheet)).toMatchInlineSnapshot(
      `"div{color:rgb(255,100,0)}"`,
    )
  })
})
