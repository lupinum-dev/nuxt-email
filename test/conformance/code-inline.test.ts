import type { Component, VNodeChild } from 'vue'
import oracle from './oracle/react-email-6.9.0.json'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EText } from '../../src/runtime/components'
import { ECodeInline, ORANGE_FR_STYLE } from '../../src/runtime/components/ECodeInline'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { renderPlainText } from '../../src/runtime/render/plain-text'
import { normalizeEmailHtml } from './normalize'

function componentFixture(
  component: Component,
  attributes: Record<string, unknown> = {},
  children?: VNodeChild,
): Component {
  return defineComponent({
    name: 'CodeInlineFixture',
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

describe('ECodeInline', () => {
  it('matches the oracle three-sibling structure with user class merged before cino/cio', {
    tags: ['conformance:code-inline-basic'],
  }, async () => {
    const html = await renderComponent(
      EText,
      null as unknown as Record<string, unknown>,
      h(ECodeInline, { class: 'inline-code' }, { default: () => 'const x = 1;' }),
    )

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['code-inline-basic'].html))
    expect(html).toContain('<code class="inline-code cino">const x = 1;</code>')
    expect(html).toContain('<span class="inline-code cio" style="display:none;">const x = 1;</span>')
  })

  it('emits the Orange.fr fix-up style rule byte-for-byte', async () => {
    const html = await renderComponent(
      EText,
      null as unknown as Record<string, unknown>,
      h(ECodeInline, { class: 'inline-code' }, { default: () => 'const x = 1;' }),
    )

    expect(ORANGE_FR_STYLE).toBe(
      '\n        meta ~ .cino {\n          display: none !important;\n          opacity: 0 !important;\n        }\n\n        meta ~ .cio {\n          display: block !important;\n        }\n      ',
    )
    expect(html).toContain(`<style>${ORANGE_FR_STYLE}</style>`)
    expect(oracle.cases['code-inline-basic'].html).toContain(`<style>${ORANGE_FR_STYLE}</style>`)
  })

  it('renders the unclassed case, normalizing away React\'s insignificant leading class space', async () => {
    const html = await renderComponent(
      EText,
      null as unknown as Record<string, unknown>,
      h(ECodeInline, {}, { default: () => 'const x = 1;' }),
    )

    // React builds `${className || ''} cino`, so an unclassed CodeInline emits a leading
    // space: `class=" cino"` / `class=" cio"`. Vue's normalizeClass trims that space (and it
    // cannot be preserved through h() while the children are user VNodes). The leading space is
    // semantically insignificant, so the conformance normalizer absorbs it and the documents match.
    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['code-inline-no-class'].html))
    expect(html).toContain('<code class="cino">const x = 1;</code>')
    expect(html).toContain('<span class="cio" style="display:none;">const x = 1;</span>')
    expect(oracle.cases['code-inline-no-class'].html).toContain('<code class=" cino">')
  })

  it('keeps both children copies so plain text repeats them, matching the oracle html', async () => {
    const html = await renderComponent(
      EText,
      null as unknown as Record<string, unknown>,
      h(ECodeInline, { class: 'inline-code' }, { default: () => 'const x = 1;' }),
    )

    const text = renderPlainText(html)

    expect(text).toContain('const x = 1;const x = 1;')
    expect(text).toBe(renderPlainText(oracle.cases['code-inline-basic'].html))
  })
})
