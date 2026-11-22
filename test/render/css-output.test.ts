import { readdir, readFile } from 'node:fs/promises'
import { type CssNode, generate, parse, walk } from 'css-tree'
import { beforeAll, describe, expect, it } from 'vitest'
import { createStyleTable } from '../../src/compiler/style-table'
import type { StyleTable } from '../../src/runtime/tw'
import { utilityMatrix } from './utility-matrix'

const golden = new URL('golden/', import.meta.url)

// Syntax that email clients do not read. A hit means a client may drop the declaration or the rule.
const forbiddenText: [string, RegExp][] = [
  ['var()', /\bvar\(/],
  ['modern colour function', /\b(?:oklch|oklab|lab|lch|color-mix|color)\(/],
  ['space-separated rgb/hsl', /\b(?:rgba?|hsla?)\(\s*[-\d.]+(?:%|deg)?\s+[-\d.]/],
  ['4- or 8-digit hex', /#(?:[\da-f]{4}|[\da-f]{8})(?![\w-])/i],
  ['@layer', /@layer\b/],
  ['@property', /@property\b/],
  ['@supports', /@supports\b/],
  ['media range', /@media[^{]*[<>]/],
  ['calc()', /\bcalc\(/],
]

// Generated CSS only: author-written styles may use rem and stay as written.
const forbiddenInGenerated: [string, RegExp][] = [...forbiddenText, ['rem', /\drem\b/i], [':where()/:is()', /:(?:where|is)\(/i]]

/** Kinds of email-unsafe syntax in a stylesheet or a block of declarations. */
function problemsIn(css: string, forbidden = forbiddenText): string[] {
  const problems = new Set(forbidden.filter(([, pattern]) => pattern.test(css)).map(([kind]) => kind))
  const rules: CssNode[] = []
  let atRules = 0
  walk(parse(css), {
    enter(node: CssNode) {
      if (node.type === 'NestingSelector') problems.add('nesting')
      if (node.type === 'Atrule' && node.block) {
        if (atRules > 0) problems.add('nested at-rule')
        atRules++
      }
      if (node.type === 'Rule') {
        if (rules.length > 0) problems.add('nesting')
        rules.push(node)
      }
      // grid-column-start/-end are physical; the others with start/end/inline/block are logical.
      if (node.type === 'Declaration' && (/(?:^|-)(?:inline|block)(?:-|$)/.test(node.property)
        || (/-(?:start|end)(?:-|$)/.test(node.property) && !node.property.startsWith('grid-')))) {
        problems.add('logical property')
      }
      if (node.type === 'Declaration' && /^(?:text-align|float|clear)$/.test(node.property)
        && /^(?:start|end|inline-start|inline-end)$/.test(generate(node.value).replace('!important', '').trim())) {
        problems.add('logical property')
      }
    },
    leave(node: CssNode) {
      if (node.type === 'Rule') rules.pop()
      if (node.type === 'Atrule' && node.block) atRules--
    },
  })
  return [...problems].sort()
}

function declarations(style: Record<string, string>): string {
  return `x{${Object.entries(style).map(([property, value]) => `${property}:${value}`).join(';')}}`
}

/** Every inline declaration and head rule of a table, keyed by class. */
function tableProblems(table: StyleTable): Record<string, string[]> {
  const found: Record<string, Set<string>> = {}
  const add = (className: string, problems: string[]) => {
    for (const problem of problems) (found[className] ??= new Set()).add(problem)
  }
  for (const [className, entry] of Object.entries(table.classes)) {
    if (entry.style) add(className, problemsIn(declarations(entry.style), forbiddenInGenerated))
  }
  for (const rule of table.head) {
    for (const className of rule.classes) add(className, problemsIn(rule.css, forbiddenInGenerated))
  }
  return Object.fromEntries(Object.entries(found).map(([className, problems]) => [className, [...problems].sort()]))
}

/** Inline `style` attributes and `<style>` contents of a rendered document. */
function documentProblems(html: string): string[] {
  const css = [
    ...[...html.matchAll(/\sstyle="([^"]*)"/g)].map(match => `x{${match[1]!.replaceAll('&quot;', '"').replaceAll('&#39;', '\'')}}`),
    ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(match => match[1]!),
  ]
  return [...new Set(css.flatMap(block => problemsIn(block)))].sort()
}

// Utilities whose output still contains such syntax. Each one did before the slice 5a engine
// change too. The test fails when an entry appears or goes away, so this table stays honest.
const knownToday: Record<string, string[]> = {
  // Gradient stops are custom properties of other classes on the same element.
  'bg-linear-to-r': ['var()'],
  // The group condition stays inside :is(); written without it, the rule would apply without the group.
  'group-hover:text-red-500': [':where()/:is()'],
  // The author wrote calc(); it stays as written.
  'w-[calc(100%-2rem)]': ['calc()'],
}

// Author styles written in a test template, not generated CSS.
const authorWritten: Record<string, string[]> = {
  'ported-document-body-style-placement.html': ['logical property'],
}

// Outlook on Windows does not read `rem`, so generated sizes are px at 16px per rem.
describe('rem in generated CSS', () => {
  it.each([
    ['p-4', { padding: '16px' }],
    ['text-sm', { 'font-size': '14px', 'line-height': '1.4285714285714286' }],
    ['rounded-md', { 'border-radius': '6px' }],
    ['w-[10rem]', { width: '160px' }],
    ['max-w-xl', { 'max-width': '576px' }],
    ['gap-2', { gap: '8px' }],
    ['tracking-wide', { 'letter-spacing': '.025em' }],
    ['leading-6', { 'line-height': '24px' }],
    ['w-[1.33333rem]', { width: '21.3333px' }],
  ])('writes %s in px', async (utility, style) => {
    expect((await createStyleTable([utility])).classes[utility]?.style).toEqual(style)
  })

  it('writes media conditions and head rules in px', async () => {
    expect((await createStyleTable(['sm:p-8'])).head.map(rule => rule.css)).toEqual([
      '@media (min-width:640px){.sm_p-8{padding:32px!important}}',
    ])
  })
})

// Lightning CSS rounds to 32-bit floats, so long numbers pass it as placeholders; a placeholder in a
// selector, such as an escaped arbitrary value, broke the class and left it without an entry.
describe('numbers with more than six significant digits', () => {
  it.each([
    ['leading-[1.4285714]', { style: { 'line-height': '1.4285714' } }],
    ['sm:w-[1.2345678px]', { residual: 'sm_w-1_2345678px', head: true }],
    ['text-red-500/[0.333333333]', { style: { color: 'rgba(251,44,54,.333)' } }],
    ['text-[13px]/[1.2345678]', { style: { 'font-size': '13px', 'line-height': '1.2345678' } }],
  ])('keeps an entry for %s', async (utility, entry) => {
    expect((await createStyleTable([utility])).classes[utility]).toEqual(entry)
  })
})

// Each class is resolved alone, so a class that only sets another class's custom properties
// does nothing; it stays in `class` (no entry) instead of disappearing without effect.
describe('classes that set only custom properties', () => {
  it.each(['ring-blue-500', 'shadow-red-500', 'from-red-500', 'sm:ring-blue-500'])('gives %s no entry', async (utility) => {
    expect((await createStyleTable([utility])).classes[utility]).toBeUndefined()
  })
})

// Email clients read a nested at-rule poorly, so stacked variants share one condition.
describe('stacked media variants', () => {
  it.each([
    ['sm:hover:bg-red-500', '@media (min-width:640px) and (hover:hover){.sm_hover_bg-red-500:hover{background-color:#fb2c36!important}}'],
    ['md:dark:text-white', '@media (min-width:768px) and (prefers-color-scheme:dark){.md_dark_text-white{color:#fff!important}}'],
    ['sm:print:hidden', '@media print and (min-width:640px){.sm_print_hidden{display:none!important}}'],
  ])('writes %s with one @media', async (utility, css) => {
    expect((await createStyleTable([utility])).head.map(rule => rule.css)).toEqual([css])
  })
})

// Some email clients drop a rule with :where() or :is(); every head declaration is !important,
// so a selector that is one of them is written without it.
describe('selector functions in head rules', () => {
  it.each([
    ['space-y-4', '.space-y-4>:not(:last-child){margin-top:0!important;margin-bottom:16px!important}'],
    ['*:bg-red-500', '.__bg-red-500>*{background-color:#fb2c36!important}'],
  ])('writes %s without :where() or :is()', async (utility, css) => {
    expect((await createStyleTable([utility])).head.map(rule => rule.css)).toEqual([css])
  })
})

// `max-sm:` is `width < 640px`; written as max-width:640px, it would match together with `sm:`.
describe('exclusive upper bounds', () => {
  it.each([
    ['max-sm:hidden', '@media (max-width:639.98px){.max-sm_hidden{display:none!important}}'],
    ['max-[600px]:p-2', '@media (max-width:599.98px){.max-600px_p-2{padding:8px!important}}'],
  ])('writes %s below the breakpoint', async (utility, css) => {
    expect((await createStyleTable([utility])).head.map(rule => rule.css)).toEqual([css])
  })
})

// Layout components move a class to their inner cell only when its head rules set padding alone.
describe('cell flag', () => {
  it.each([
    ['sm:p-8', true],
    ['md:px-10', true],
    ['max-sm:pt-0', true],
    ['sm:bg-red-500', undefined],
    ['sm:text-lg', undefined],
    ['hover:underline', undefined],
    ['p-4', undefined],
  ])('marks %s: %s', async (utility, cell) => {
    expect((await createStyleTable([utility])).classes[utility]?.cell).toBe(cell)
  })
})

describe('generated CSS', () => {
  let table: StyleTable
  beforeAll(async () => {
    table = await createStyleTable(utilityMatrix)
  })

  // A change to the CSS conversion shows up here class by class.
  it('pins the style table of the utility matrix', async () => {
    await expect(`${JSON.stringify(table, null, 2)}\n`).toMatchFileSnapshot('golden/utility-matrix.json')
  })

  it('uses no email-unsafe syntax in the utility matrix beyond the known list', () => {
    expect(tableProblems(table)).toEqual(knownToday)
  })

  it('uses no email-unsafe syntax in any golden email', async () => {
    const files = (await readdir(golden)).filter(file => file.endsWith('.html'))
    const found: Record<string, string[]> = {}
    for (const file of files) {
      const problems = documentProblems(await readFile(new URL(file, golden), 'utf8'))
      if (problems.length > 0) found[file] = problems
    }
    expect(files.length).toBeGreaterThan(60)
    expect(found).toEqual(authorWritten)
  })
})
