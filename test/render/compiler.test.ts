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

// A browser applies rules in stylesheet order, whatever the order in `class`, and the
// inline `style` attribute after every rule.
describe('declaration order', () => {
  it.each([
    ['pl-2 p-4', '', 'padding:16px;padding-left:8px;'],
    ['p-4 pl-2', '', 'padding:16px;padding-left:8px;'],
    ['border-dashed border', '', 'border-width:1px;border-style:dashed;'],
    ['p-4 pl-2', ' style="padding:0"', 'padding-left:8px;padding:0;'],
    // Outlook on Windows reads only the `text-decoration` shorthand; the color still applies after it.
    ['decoration-red-500 underline', '', 'text-decoration:underline;text-decoration-color:#fb2c36;'],
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
