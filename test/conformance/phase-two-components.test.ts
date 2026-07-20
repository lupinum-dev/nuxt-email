import type { Component, VNodeChild } from 'vue'
import oracle from './oracle/react-email-6.9.0.json'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  EButton,
  EColumn,
  EContainer,
  EPreview,
  ERow,
  ESection,
} from '../../src/runtime/components'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { renderPlainText } from '../../src/runtime/render/plain-text'
import { normalizeEmailHtml } from './normalize'

function componentFixture(
  component: Component,
  attributes: Record<string, unknown> = {},
  children?: VNodeChild,
): Component {
  return defineComponent({
    name: 'PhaseTwoComponentFixture',
    setup() {
      return () => h(component, attributes, children === undefined
        ? undefined
        : { default: () => children })
    },
  })
}

async function renderComponent(
  component: Component,
  attributes: Record<string, unknown> = {},
  children?: VNodeChild,
): Promise<string> {
  return renderComponentToHtml(componentFixture(component, attributes, children))
}

describe('EPreview', () => {
  it('renders exact hidden preview filler without React title leakage', async () => {
    const html = await renderComponent(EPreview, {}, 'Inbox preview')

    expect(html).toContain('style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;"')
    expect(html).toContain('data-skip-in-text="true"')
    expect(html).toContain(oracle.cases['preview-short'].expectedExactFragments[0])
    expect(html).not.toContain('<title>')
    expect(renderPlainText(html)).toBe('')
  })

  it('uses one filler sequence at 199 characters and none at 200', async () => {
    const belowMaximum = await renderComponent(EPreview, {}, 'x'.repeat(199))
    const atMaximum = await renderComponent(EPreview, {}, 'x'.repeat(200))

    expect(belowMaximum).toContain('<div> ‌​‍‎‏﻿</div>')
    expect(atMaximum.match(/<div/g)).toHaveLength(1)
    expect(atMaximum).toContain(`>${'x'.repeat(200)}</div>`)
  })

  it('forwards safe attributes while keeping plain-text exclusion fixed', async () => {
    const html = await renderComponent(EPreview, {
      'class': 'preview',
      'data-skip-in-text': 'false',
      'id': 'preview-test',
      'style': { color: 'red' },
    }, 'Safe & escaped')

    expect(html).toContain('class="preview"')
    expect(html).toContain('id="preview-test"')
    expect(html).toContain('style="color:red;display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;"')
    expect(oracle.cases['preview-style-override'].html).toContain('style="color:red"')
    expect(oracle.cases['preview-style-override'].html).not.toContain('display:none')
    expect(html).toContain('data-skip-in-text="true"')
    expect(html).toContain('Safe &amp; escaped')
  })

  it('rejects element children and unsafe attributes', async () => {
    await expect(renderComponent(EPreview, {}, h('strong', 'Nested')))
      .rejects.toThrow('EPreview default slot must contain text only')
    await expect(renderComponent(EPreview, { innerHTML: '<b>unsafe</b>' }))
      .rejects.toThrow('EPreview does not support unsafe HTML attribute: innerHTML')
  })
})

describe('table layout primitives', () => {
  it('matches EContainer centering, maximum width, and padding placement', async () => {
    const html = await renderComponent(EContainer, {
      id: 'container-test',
      style: { backgroundColor: 'white', maxWidth: '600px', padding: '24px' },
    }, 'Container content')

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['container-padding'].html))
    expect(html).toContain('<tr style="width:100%;"><td style="padding:24px;">Container content</td></tr>')
  })

  it('keeps logical padding on EContainer table while moving physical padding', async () => {
    const html = await renderComponent(EContainer, {
      style: { backgroundColor: 'red', padding: '12px', paddingInline: '8px' },
    }, 'Content')

    expect(html).toContain('style="max-width:37.5em;background-color:red;padding-inline:8px;"')
    expect(html).toContain('<td style="padding:12px;">Content</td>')
  })

  it('matches ESection structure and padding placement', async () => {
    const html = await renderComponent(ESection, {
      id: 'section-test',
      style: { backgroundColor: '#f4f4f4', padding: '16px 20px' },
    }, 'Section content')

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['section-padding'].html))
    expect(html).toContain('<tbody><tr><td style="padding:16px 20px;">Section content</td></tr></tbody>')
  })

  it('renders ESection, ERow, and two direct EColumn cells as valid table layout', async () => {
    const row = h(ERow, { id: 'row-test' }, {
      default: () => [
        h(EColumn, { style: { color: 'red' }, width: '50%' }, { default: () => h('strong', 'Left') }),
        h(EColumn, { width: '50%' }, { default: () => 'Right' }),
      ],
    })
    const html = await renderComponent(ESection, {}, row)

    expect(html).toContain('<tbody style="width:100%;"><tr style="width:100%;"><td style="color:red;" width="50%"><strong>Left</strong></td><td width="50%">Right</td></tr></tbody>')
    expect(html).not.toContain('__react-email-column')
  })

  it('renders an empty ERow and forwards Row and Column attributes', async () => {
    const emptyRow = await renderComponent(ERow)
    const column = await renderComponent(EColumn, {
      'aria-label': 'Primary column',
      'colspan': 2,
      'style': { backgroundColor: 'red' },
      'width': '300',
    }, 'Column & content')

    expect(emptyRow).toContain('<tbody style="width:100%;"><tr style="width:100%;"></tr></tbody>')
    expect(column).toContain('aria-label="Primary column"')
    expect(column).toContain('colspan="2"')
    expect(column).toContain('style="background-color:red;"')
    expect(column).toContain('width="300"')
    expect(column).toContain('Column &amp; content')
  })
})

describe('EButton', () => {
  it('matches the padded React oracle including exact Outlook fragments', async () => {
    const html = await renderComponent(EButton, {
      href: 'https://example.com',
      style: { padding: '12px 20px' },
    }, 'Activate account')

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['button-padding'].html))
    for (const fragment of oracle.cases['button-padding'].expectedExactFragments) {
      expect(html).toContain(fragment)
    }
  })

  it('matches the no-padding React oracle and exact zero-width fragments', async () => {
    const html = await renderComponent(EButton, { href: 'https://example.com' })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['button-no-padding'].html))
    for (const fragment of oracle.cases['button-no-padding'].expectedExactFragments) {
      expect(html).toContain(fragment)
    }
  })

  it('preserves user styles, native attributes, target, and escaping', async () => {
    const html = await renderComponent(EButton, {
      'aria-label': 'Activate & continue',
      'class': 'primary',
      'href': 'https://example.com/?value="quoted"&mode=test',
      'id': 'button-test',
      'rel': 'noreferrer',
      'style': {
        backgroundColor: '#111',
        display: 'block',
        lineHeight: '150%',
        maxWidth: '50%',
        padding: '1px 11px 3px 4px',
        textDecoration: 'underline',
      },
      'target': '_self',
    }, 'Click & continue')

    expect(html).toContain('href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"')
    expect(html).toContain('aria-label="Activate &amp; continue"')
    expect(html).toContain('class="primary"')
    expect(html).toContain('rel="noreferrer"')
    expect(html).toContain('target="_self"')
    expect(html).toContain('style="line-height:150%;text-decoration:underline;display:block;max-width:50%;mso-padding-alt:0px;background-color:#111;padding:1px 11px 3px 4px;padding-top:1px;padding-right:11px;padding-bottom:3px;padding-left:4px;"')
    expect(html).toContain('<!--[if mso]><i style="mso-font-width:200%;mso-text-raise:3px" hidden>&#8202;</i><![endif]-->')
    expect(html).toContain('<!--[if mso]><i style="mso-font-width:275%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->')
    expect(html).toContain('>Click &amp; continue</span>')
    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['button-asymmetric'].html))
    expect(renderPlainText(html)).toBe(oracle.cases['button-asymmetric-text'].text)
  })

  it('renders equivalent Outlook spacing for Vue style forms', async () => {
    const styles = [
      { padding: '12px 20px' },
      'padding:12px 20px',
      [{ padding: '12px' }, { paddingRight: '20px', paddingLeft: '20px' }],
    ]
    const fragments: string[] = []

    for (const style of styles) {
      const html = await renderComponent(EButton, { style }, 'Button')
      fragments.push(html.match(/<!--\[if mso\]>.*?<!\[endif\]-->/)?.[0] ?? '')
    }

    expect(new Set(fragments).size).toBe(1)
  })

  it('rejects unsafe attributes and non-finite padding', async () => {
    await expect(renderComponent(EButton, { onclick: 'unsafe()' }))
      .rejects.toThrow('EButton does not support unsafe HTML attribute: onclick')
    await expect(renderComponent(EButton, { style: { padding: Number.POSITIVE_INFINITY } }))
      .rejects.toThrow('EButton padding must resolve to finite pixels; received Infinity')
  })

  it('renders byte-identically on repeated runs', async () => {
    const attributes = { href: 'https://example.com', style: { padding: '12px 20px' } }

    expect(await renderComponent(EButton, attributes, 'Button'))
      .toBe(await renderComponent(EButton, attributes, 'Button'))
  })
})
