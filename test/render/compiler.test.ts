import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileEmailDirectory } from '../../src/compiler/build-templates'
import { createStyleLookup, createTw, createEmailRenderState } from '../../src/runtime/tw'
import { buildEmails, workDirectory } from './build'

const directory = `${workDirectory}/compiler`

async function writeTemplates(name: string, files: Record<string, string>): Promise<string> {
  const target = `${directory}/${name}`
  await rm(target, { recursive: true, force: true })
  for (const [path, source] of Object.entries(files)) {
    await mkdir(`${target}/${path}`.replace(/\/[^/]+$/, ''), { recursive: true })
    await writeFile(`${target}/${path}`, source)
  }
  return target
}

describe('compiler', () => {
  it('fails the build on an unknown component tag with file and tag', async () => {
    const target = await writeTemplates('unknown', {
      'order.vue': '<template><EEmail subject="Order" lang="en"><OrderSummary class="p-4" /></EEmail></template>\n',
    })
    await expect(compileEmailDirectory({ directory: target, outfile: `${workDirectory}/build/unknown.mjs` }))
      .rejects.toThrow(`Unknown email component <OrderSummary> in ${join(target, 'order.vue')}. Import it in the template's script or use a registered E* component.`)
  })

  it('compiles imported local components in both tag cases and registered E* components', async () => {
    const target = await writeTemplates('known', {
      'components/OrderSummary.vue': '<template><p class="m-0"><slot /></p></template>\n',
      'order.vue': [
        '<script setup lang="ts">',
        'import OrderSummary from \'./components/OrderSummary.vue\'',
        '</script>',
        '<template><EEmail subject="Order" lang="en"><OrderSummary>A</OrderSummary><order-summary>B</order-summary><EText>C</EText></EEmail></template>',
        '',
      ].join('\n'),
    })
    const { renderEmail } = await buildEmails(target)
    const { html } = await renderEmail('order')
    expect(html).toContain('<p style="margin:0;">A</p><p style="margin:0;">B</p>')
  })
})

// The build reads class names from the source. A name that exists only at run time is
// not there; `@source inline()` in tailwind.css adds it, with Tailwind's brace expansion.
describe('@source inline() in tailwind.css', () => {
  it('resolves class names that are built at run time', async () => {
    const target = await writeTemplates('source-inline', {
      'tailwind.css': '@source inline("text-{red,emerald}-600 sm:p-4");\n',
      'status.vue': [
        '<script setup lang="ts">',
        'defineProps<{ tone: string, size: string }>()',
        '</script>',
        '<template><EEmail subject="Status" lang="en"><p :class="[`text-${tone}-600`, `${size}:p-4`]">A</p></EEmail></template>',
        '',
      ].join('\n'),
    })
    const { renderEmail } = await buildEmails(target)
    const { html } = await renderEmail('status', { tone: 'emerald', size: 'sm' })
    expect(html).toContain('<p class="sm_p-4" style="color:#096;">A</p>')
    expect(html).toContain('<style>@media (min-width:640px){.sm_p-4{padding:16px!important}}</style>')
  })

  it('fails the build on @source with a path', async () => {
    const target = await writeTemplates('source-path', {
      'tailwind.css': '@source "../components";\n',
      'note.vue': '<template><EEmail subject="Note" lang="en"><p>A</p></EEmail></template>\n',
    })
    await expect(buildEmails(target)).rejects.toThrow('Tailwind @source with a path is not supported in email Tailwind CSS')
  })
})

// A class without a style-table entry stays in `class` and has no effect: a wrong name,
// a name built at run time, or a utility that only changes another class. The test
// renderer fails on it; production keeps it.
describe('classes kept as written', () => {
  const files = {
    'note.vue': '<template><EEmail subject="Note" lang="en"><p class="text-slte-600 ring-blue-500 footer-link p-4">A</p></EEmail></template>\n',
  }

  it('fail the test render with their names', async () => {
    const { renderEmail } = await buildEmails(await writeTemplates('unknown-strict', files))
    await expect(renderEmail('note')).rejects.toMatchObject({
      name: 'EmailRenderError',
      cause: { message: expect.stringContaining('The email kept these classes as written: footer-link, ring-blue-500, text-slte-600. ') },
    })
  })

  it.each([
    ['a list', ['footer-link', 'ring-blue-500', 'text-slte-600']],
    ['true', true],
  ] as const)('render when allowUnknownClasses is %s', async (label, allowUnknownClasses) => {
    const { renderEmail } = await buildEmails(await writeTemplates(`unknown-allowed-${label.replace(' ', '-')}`, files), { allowUnknownClasses })
    expect((await renderEmail('note')).html).toContain('<p class="text-slte-600 ring-blue-500 footer-link" style="padding:16px;">A</p>')
  })

  // `group` and `peer` produce no CSS, but the rule of `group-hover:` selects them.
  it('do not include the group and peer markers, which keep the name their rules select', async () => {
    const target = await writeTemplates('markers', {
      'note.vue': '<template><EEmail subject="Note" lang="en"><a class="group/item" href="https://example.com"><span class="group-hover/item:underline">A</span></a><p class="peer">B</p></EEmail></template>\n',
    })
    const { renderEmail } = await buildEmails(target)
    const { html } = await renderEmail('note')
    expect(html).toContain('<a class="group_item" href="https://example.com"><span class="group-hover_item_underline">A</span></a><p class="peer">B</p>')
    expect(html).toContain('.group-hover_item_underline:is(:where(.group_item):hover *)')
  })

  it('fail for the classes that the list does not name', async () => {
    const { renderEmail } = await buildEmails(await writeTemplates('unknown-partial', files), { allowUnknownClasses: ['footer-link'] })
    await expect(renderEmail('note')).rejects.toMatchObject({
      cause: { message: expect.stringContaining('kept these classes as written: ring-blue-500, text-slte-600. ') },
    })
  })
})

// A plain rule in tailwind.css comes after the utilities in the stylesheet. Its line must
// not reset the color and thickness of the utilities before it.
describe('text-decoration-line', () => {
  it('becomes the shorthand before the decoration utilities, also from a later rule', async () => {
    const target = await writeTemplates('decoration-line', {
      'tailwind.css': '.brand-link { text-decoration-line: underline; }\n',
      'note.vue': '<template><EEmail subject="Note" lang="en"><a class="brand-link decoration-red-500 decoration-2" href="https://example.com">A</a><EButton class="underline decoration-red-500" href="https://example.com">B</EButton></EEmail></template>\n',
    })
    const { renderEmail } = await buildEmails(target)
    const { html } = await renderEmail('note')
    expect(html).toContain('<a style="text-decoration:underline;text-decoration-color:#fb2c36;text-decoration-thickness:2px;" href="https://example.com">A</a>')
    expect(html).toMatch(/<a href="https:\/\/example.com" style="[^"]*text-decoration:underline;[^"]*text-decoration-color:#fb2c36;[^"]*" target="_blank">/)
    expect(html).not.toContain('text-decoration-line')
  })
})

// A browser applies rules in stylesheet order, whatever the order in `class`, and the
// inline `style` attribute after every rule.
describe('declaration order', () => {
  it.each([
    ['pl-2 p-4', '', 'padding:16px;padding-left:8px;'],
    ['p-4 pl-2', '', 'padding:16px;padding-left:8px;'],
    ['border-dashed border', '', 'border-width:1px;border-style:dashed;'],
    ['p-4 pl-2', ' style="padding:0"', 'padding-left:8px;padding:0;'],
    // Outlook on Windows reads only `text-decoration`. The line comes first as the shorthand, so
    // the color after it still applies; an important line stays too, or it would beat the color.
    ['text-sm decoration-red-500 underline', '', 'text-decoration:underline;font-size:14px;line-height:1.4285714285714286;text-decoration-color:#fb2c36;'],
    ['decoration-red-500 underline!', '', 'text-decoration:underline;text-decoration-line:underline!important;text-decoration-color:#fb2c36;'],
    ['no-underline', ' style="text-decoration-thickness:2px"', 'text-decoration:none;text-decoration-thickness:2px;'],
  ])('class="%s"%s', async (classes, style, expected) => {
    const target = await writeTemplates(`order-${classes.replaceAll(' ', '_')}${style ? '-style' : ''}`, {
      'order.vue': `<template><EEmail subject="Order" lang="en"><div class="${classes}"${style}>A</div></EEmail></template>\n`,
    })
    const { renderEmail } = await buildEmails(target)
    expect((await renderEmail('order')).html).toContain(`<div style="${expected}">A</div>`)
  })
})

// EButton reads camelCase style keys for its Outlook padding; a kebab-case tag must get them too.
describe('kebab-case email component tags', () => {
  it('renders <e-button> like <EButton>', async () => {
    const target = await writeTemplates('kebab', {
      'order.vue': '<template><EEmail subject="Order" lang="en"><e-button href="https://example.com" class="px-4 py-2">Go</e-button><EButton href="https://example.com" class="px-4 py-2">Go</EButton></EEmail></template>\n',
    })
    const { renderEmail } = await buildEmails(target)
    const buttons = (await renderEmail('order')).html.match(/<a .*?<\/a>/g)
    expect(buttons).toHaveLength(2)
    expect(buttons![0]).toBe(buttons![1])
  })
})

describe('unknown classes', () => {
  it('records every class the style table does not know and keeps it verbatim', () => {
    const state = createEmailRenderState()
    const tw = createTw(createStyleLookup({ classes: { 'p-4': { style: { padding: '1rem' } } }, head: [] }), state)
    expect(tw('p-4 brand-header text-${tone}', undefined)).toEqual({ class: 'brand-header text-${tone}', style: { padding: '1rem' } })
    expect([...state.unknownClasses]).toEqual(['brand-header', 'text-${tone}'])
  })
})
