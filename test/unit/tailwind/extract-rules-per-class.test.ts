import { type CssNode, generate, parse, type StyleSheet } from 'css-tree'
import { describe, expect, it } from 'vitest'
import { sanitizeStyleSheet } from '../../../src/compiler/tailwind/sanitize-stylesheet'
import { setupTailwind } from '../../../src/compiler/tailwind/setup-tailwind'
import { extractRulesPerClass } from '../../../src/compiler/tailwind/css/extract-rules-per-class'

describe('extractRulesPerClass()', () => {
  it('does not discard unsupported wrappers around a requested utility', () => {
    const stylesheet = parse('@scope (.card) {.utility {color:red}}') as StyleSheet
    expect(() => extractRulesPerClass(stylesheet, ['utility'])).toThrow('@scope rules are not supported')
    expect(extractRulesPerClass(stylesheet, ['other']).inlinable.size).toBe(0)
  })

  it.each([
    { css: ':not(.x){color:red}', requested: ['x'] },
    { css: ':has(.child){color:red}', requested: ['child'] },
    { css: ':where(.utility):not(.x){color:red}', requested: ['x'] },
  ])('does not let a condition class in $css own the rule', ({ css, requested }) => {
    const rules = extractRulesPerClass(parse(css) as StyleSheet, requested)
    expect(rules.inlinable.size).toBe(0)
    expect(rules.nonInlinable.size).toBe(0)
    expect(rules.orderedNonInlinable).toEqual([])
  })

  it.each(['where', 'not', 'has'])('keys a [:%s(&)] arbitrary variant by its own utility', async (pseudo) => {
    const utility = `[:${pseudo}(&)]:bg-red-500`
    const build = await setupTailwind()
    const rules = extractRulesPerClass(sanitizeStyleSheet(build([utility])), [utility])
    expect([...rules.nonInlinable.keys()]).toEqual([utility])
    expect(rules.inlinable.size).toBe(0)
  })

  it('retains unconditional utilities inside a structural layer', () => {
    const stylesheet = parse('@layer utilities {.utility {color:red}}') as StyleSheet
    expect(extractRulesPerClass(stylesheet, ['utility']).inlinable.has('utility')).toBe(true)
  })

  it('keeps enclosing media and supports conditions out of inline styles', () => {
    const stylesheet = parse(`
      .base { color: black }
      @MEDIA (prefers-color-scheme: dark) {
        @supports (color: red) { .conditional { color: white } }
      }
      .after { color: red }
    `) as StyleSheet
    const rules = extractRulesPerClass(stylesheet, ['base', 'conditional', 'after'])
    expect([...rules.inlinable.keys()]).toEqual(['base', 'after'])
    expect([...rules.nonInlinable.keys()]).toEqual(['conditional'])
    expect(rules.orderedNonInlinable.map(rule => generate(rule))).toEqual([
      '@MEDIA (prefers-color-scheme:dark){@supports (color:red){.conditional{color:white}}}',
    ])
  })

  function convertToComparable(
    map: Map<string, CssNode[]>,
  ): Record<string, string[]> {
    return Object.fromEntries(
      Array.from(map.entries()).map(([k, rules]) => [
        k,
        rules.map(rule => generate(rule)),
      ]),
    )
  }

  it('works with just inlinable utilities', async () => {
    const build = await setupTailwind()
    const classes = ['text-center', 'bg-red-500']
    const stylesheet = sanitizeStyleSheet(build(classes))

    const { inlinable, nonInlinable } = extractRulesPerClass(
      stylesheet,
      classes,
    )

    expect(convertToComparable(inlinable)).toMatchInlineSnapshot(`
      {
        "bg-red-500": [
          ".bg-red-500{background-color:#fb2c36}",
        ],
        "text-center": [
          ".text-center{text-align:center}",
        ],
      }
    `)
    expect(convertToComparable(nonInlinable)).toMatchInlineSnapshot('{}')
  })

  it('keeps the values of every rule when a class is defined more than once', async () => {
    const build = await setupTailwind(
      '.box { @apply rounded-lg bg-white p-4; } .box { @apply bg-red-500; }',
    )
    const classes = ['box']

    const stylesheet = sanitizeStyleSheet(build(classes))
    const { inlinable } = extractRulesPerClass(stylesheet, classes)

    expect(convertToComparable(inlinable)).toMatchInlineSnapshot(`
      {
        "box": [
          ".box{background-color:#fb2c36;border-radius:8px;padding:16px}",
        ],
      }
    `)
  })

  it('handles non-inlinable utilities', async () => {
    const build = await setupTailwind()
    const classes = ['lg:w-1/2']
    const stylesheet = sanitizeStyleSheet(build(classes))

    const { inlinable, nonInlinable } = extractRulesPerClass(
      stylesheet,
      classes,
    )

    expect(convertToComparable(inlinable)).toMatchInlineSnapshot('{}')
    expect(convertToComparable(nonInlinable)).toMatchInlineSnapshot(`
      {
        "lg:w-1/2": [
          "@media (min-width:1024px){.lg\\:w-1\\/2{width:50%}}",
        ],
      }
    `)
  })

  it('handles a mix of inlinable and non-inlinable utilities', async () => {
    const build = await setupTailwind()
    const classes = [
      'text-center',
      'bg-red-500',
      'some-other-class', // should be ignored
      'w-full',
      'lg:w-1/2',
    ]

    const stylesheet = sanitizeStyleSheet(build(classes))
    const { inlinable, nonInlinable } = extractRulesPerClass(
      stylesheet,
      classes,
    )
    expect(convertToComparable(inlinable)).toMatchInlineSnapshot(`
      {
        "bg-red-500": [
          ".bg-red-500{background-color:#fb2c36}",
        ],
        "text-center": [
          ".text-center{text-align:center}",
        ],
        "w-full": [
          ".w-full{width:100%}",
        ],
      }
    `)
    expect(convertToComparable(nonInlinable)).toMatchInlineSnapshot(`
      {
        "lg:w-1/2": [
          "@media (min-width:1024px){.lg\\:w-1\\/2{width:50%}}",
        ],
      }
    `)
  })

  it('splits a nested utility into its inlinable base and its media rule', async () => {
    const build = await setupTailwind(
      '@utility text-body { @apply text-[green] sm:text-[darkgreen]; }',
    )
    const classes = ['text-body']

    const stylesheet = sanitizeStyleSheet(build(classes))
    const { inlinable, nonInlinable } = extractRulesPerClass(
      stylesheet,
      classes,
    )

    expect(convertToComparable(inlinable)).toMatchInlineSnapshot(`
      {
        "text-body": [
          ".text-body{color:green}",
        ],
      }
    `)
    expect(convertToComparable(nonInlinable)).toMatchInlineSnapshot(`
      {
        "text-body": [
          "@media (min-width:640px){.text-body{color:#006400}}",
        ],
      }
    `)
  })

  it('treats rules with pseudo-selectors as fully non-inlinable', async () => {
    const build = await setupTailwind('.btn:hover { color: red }')
    const classes = ['btn']

    const stylesheet = sanitizeStyleSheet(build(classes))
    const { inlinable, nonInlinable } = extractRulesPerClass(
      stylesheet,
      classes,
    )

    expect(convertToComparable(inlinable)).toMatchInlineSnapshot('{}')
    expect(convertToComparable(nonInlinable)).toMatchInlineSnapshot(`
      {
        "btn": [
          ".btn:hover{color:red}",
        ],
      }
    `)
  })

  it('does not emit a bare nested rule for group/peer marker classes', async () => {
    const build = await setupTailwind()
    const classes = ['group', 'group-hover:underline']
    const stylesheet = sanitizeStyleSheet(build(classes))
    const { inlinable, nonInlinable } = extractRulesPerClass(
      stylesheet,
      classes,
    )

    // Only the real utility is keyed; the `group` marker must not produce a
    // duplicate, parentless `&:is(...)` rule.
    expect(Object.keys(convertToComparable(inlinable))).toEqual([])
    expect(convertToComparable(nonInlinable)).toMatchInlineSnapshot(`
      {
        "group-hover:underline": [
          "@media (hover:hover){.group-hover\\:underline:is(:where(.group):hover *){text-decoration-line:underline}}",
        ],
      }
    `)
  })

  it('keeps one canonical copy of non-inlinable rules in source order', () => {
    const stylesheet = parse(
      '.a:hover{color:red}.b:hover{color:blue}'
      + '.a:focus{color:green}.a:hover,.b:hover{text-decoration:underline}',
    ) as StyleSheet

    const { orderedNonInlinable } = extractRulesPerClass(stylesheet, ['a', 'b'])

    expect(orderedNonInlinable.map(rule => generate(rule))).toEqual([
      '.a:hover{color:red}',
      '.b:hover{color:blue}',
      '.a:focus{color:green}',
      '.a:hover,.b:hover{text-decoration:underline}',
    ])
  })
})
