import type { Component } from 'vue'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EBody } from '../../src/runtime/components/EBody'
import { EHead } from '../../src/runtime/components/EHead'
import { EHtml } from '../../src/runtime/components/EHtml'
import { EText } from '../../src/runtime/components/EText'
import { ETailwind } from '../../src/runtime/components/ETailwind'
import { createTailwindEngine } from '../../src/runtime/tailwind/engine/index'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import {
  nonInlinableClassNames,
  scanTailwindTree,
  TailwindMissingHeadError,
} from '../../src/runtime/tailwind/transform'

function fixture(render: () => unknown): Component {
  return defineComponent({
    name: 'TransformFixture',
    setup() {
      return render
    },
  })
}

function emailWith(body: unknown, head: unknown = h(EHead)): Component {
  return fixture(() => h(ETailwind, null, {
    default: () => h(EHtml, null, { default: () => [head, h(EBody, null, { default: () => body })] }),
  }))
}

describe('scanTailwindTree', () => {
  it('collects class tokens in tree order (duplicates kept) and detects a head', () => {
    const tree = h(EHtml, null, {
      default: () => [
        h(EHead),
        h(EBody, null, { default: () => h('div', { class: 'a b a' }, h('span', { class: 'c' })) }),
      ],
    })
    const { classNames, hasHead } = scanTailwindTree([tree])
    expect(classNames).toEqual(['a', 'b', 'a', 'c'])
    expect(hasHead).toBe(true)
  })

  it('reports no head when none exists in the subtree', () => {
    const { classNames, hasHead } = scanTailwindTree([h('div', { class: 'md:bg-red-500' })])
    expect(classNames).toEqual(['md:bg-red-500'])
    expect(hasHead).toBe(false)
  })
})

describe('nonInlinableClassNames', () => {
  it('returns only the original names of classes that produced non-inlinable rules', async () => {
    const engine = await createTailwindEngine()
    const computed = engine.computeStyles(['md:bg-red-500', 'p-4', 'not-a-utility'])
    // p-4 is inlinable (absent from residual); not-a-utility is unknown (maps to itself).
    expect(nonInlinableClassNames(computed)).toEqual(['md:bg-red-500'])
  })
})

describe('eTailwind precedence', () => {
  it('layers component defaults < tailwind < author style', async () => {
    // font-size: default 14px (EText) is overridden by author 20px; color comes from the
    // tw utility; line-height/margins are the untouched component defaults.
    const html = await renderComponentToHtml(
      emailWith(h(EText, { class: 'text-white', style: { fontSize: '20px' } }, { default: () => 'Hi' })),
    )
    expect(html).toContain('style="font-size:20px;line-height:24px;color:rgb(255,255,255);margin-top:16px;margin-bottom:16px;"')
  })

  it('drops a fully-inlined class from the element entirely', async () => {
    const html = await renderComponentToHtml(emailWith(h('div', { class: 'p-4' }, 'x')))
    expect(html).toContain('<div style="padding:1rem;">x</div>')
    expect(html).not.toContain('class=')
  })
})

describe('head style injection', () => {
  it('always injects a style element into the head, empty when there are no non-inlinable rules', async () => {
    const html = await renderComponentToHtml(emailWith(h('div', { class: 'p-4' }, 'x')))
    expect(html).toContain('<meta name="x-apple-disable-message-reformatting"><style></style></head>')
  })

  it('appends the injected style after non-style head children', async () => {
    const html = await renderComponentToHtml(
      emailWith(
        h('div', { class: 'md:bg-red-500' }, 'x'),
        h(EHead, null, { default: () => h('title', null, 'T') }),
      ),
    )
    expect(html).toContain('<title>T</title><style>@media (min-width:48rem){.md_bg-red-500{background-color:rgb(251,44,54)!important}}</style></head>')
  })

  it('injects raw css that is not html-escaped (pseudo-class rules keep their &)', async () => {
    const html = await renderComponentToHtml(emailWith(h('div', { class: 'hover:bg-red-500' }, 'x')))
    expect(html).toContain('&:hover{background-color:rgb(251,44,54)!important}')
    expect(html).not.toContain('&amp;:hover')
  })
})

describe('missing head', () => {
  it('throws the exact React Email error with the offending class names', async () => {
    const withoutHead = fixture(() => h(ETailwind, null, { default: () => h('div', { class: 'md:bg-red-500' }) }))
    await expect(renderComponentToHtml(withoutHead)).rejects.toThrow(TailwindMissingHeadError)
    await expect(renderComponentToHtml(withoutHead)).rejects.toThrow(
      'Tailwind: <head> not found inside <Tailwind>.\nMove <Head /> inside <Tailwind>, or remove these classes that require a <head>: md:bg-red-500.',
    )
  })

  it('does not throw when there are no non-inlinable rules and no head', async () => {
    const inlineOnly = fixture(() => h(ETailwind, null, { default: () => h('div', { class: 'p-4' }, 'x') }))
    await expect(renderComponentToHtml(inlineOnly)).resolves.toContain('<div style="padding:1rem;">x</div>')
  })
})

describe('idempotence outside a Tailwind region', () => {
  it('leaves an email that does not use ETailwind byte-for-byte unchanged', async () => {
    const plain = fixture(() => h(EHtml, null, {
      default: () => [h(EHead), h(EBody, null, { default: () => h('div', { class: 'p-4' }, 'x') })],
    }))
    const first = await renderComponentToHtml(plain)
    const second = await renderComponentToHtml(plain)
    expect(first).toBe(second)
    // No injected style and no inlining: the raw class survives, no style attribute appears.
    expect(first).toContain('<div class="p-4">x</div>')
    expect(first).not.toContain('<style>')
  })
})
