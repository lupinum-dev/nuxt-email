import type { TailwindConfig } from '../../src/runtime/tailwind/engine/index'
import type { Component, VNodeChild } from 'vue'
import oracle from './oracle/react-email-6.9.0.json'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  EBody,
  EButton,
  EColumn,
  EContainer,
  EHeading,
  EHtml,
  ERow,
  ESection,
  EText,
} from '../../src/runtime/components'
import { EHead } from '../../src/runtime/components/EHead'
import { ETailwind } from '../../src/runtime/components/ETailwind'
import { pixelBasedPreset } from '../../src/runtime/tailwind/engine/index'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { normalizeEmailHtml } from './normalize'

// Same shape as scripts/generate-react-oracle.ts `tailwindEmail`: wrap
// <ETailwind><EHtml><EHead/><EBody>{body}</EBody></EHtml></ETailwind>.
function tailwindEmail(
  config: TailwindConfig | undefined,
  body: VNodeChild,
  head?: VNodeChild,
): Component {
  return defineComponent({
    name: 'TailwindFixture',
    setup() {
      return () => h(ETailwind, config ? { config } : {}, {
        default: () => h(EHtml, null, {
          default: () => [
            head ?? h(EHead),
            h(EBody, null, { default: () => body }),
          ],
        }),
      })
    },
  })
}

async function render(
  config: TailwindConfig | undefined,
  body: VNodeChild,
  head?: VNodeChild,
): Promise<string> {
  return renderComponentToHtml(tailwindEmail(config, body, head))
}

// EColumn drops React Email's data-id="__react-email-column" marker (a documented
// intentional divergence). The shared normalizer does not remove it, so strip it
// from the oracle before the normalized full-document comparison.
function stripColumnDataId(html: string): string {
  return html.replaceAll(' data-id="__react-email-column"', '')
}

function expectMatches(html: string, key: keyof typeof oracle.cases, transformOracle: (h: string) => string = h => h): void {
  const expected = (oracle.cases[key] as { html: string }).html
  expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(transformOracle(expected)))
}

describe('eTailwind conformance', () => {
  it('tw-basic-inlining: utilities inlined to style, classes removed', {
    tags: ['conformance:tw-basic-inlining'],
  }, async () => {
    const html = await render(undefined, h('div', { class: 'bg-red-500 text-white p-4' }, 'Content'))
    expectMatches(html, 'tw-basic-inlining')
    expect(html).toContain('<div style="background-color:rgb(251,44,54);color:rgb(255,255,255);padding:1rem;">Content</div>')
  })

  it('tw-author-style-precedence: author style wins over utility', {
    tags: ['conformance:tw-author-style-precedence'],
  }, async () => {
    const html = await render(undefined, h('div', { class: 'bg-red-500', style: { backgroundColor: 'blue' } }, 'Content'))
    expectMatches(html, 'tw-author-style-precedence')
    expect(html).toContain('<div style="background-color:blue;">Content</div>')
  })

  it('tw-component-style-override: utility flows into the primitive and its margin logic re-runs', {
    tags: ['conformance:tw-component-style-override'],
  }, async () => {
    const html = await render(undefined, h(EText, { class: 'm-0' }, { default: () => 'Content' }))
    expectMatches(html, 'tw-component-style-override')
    // m-0 => margin:0rem is fed into EText, which re-splits it into all four sides.
    expect(html).toContain('style="font-size:14px;line-height:24px;margin:0rem;margin-top:0rem;margin-bottom:0rem;margin-left:0rem;margin-right:0rem;"')
  })

  it('tw-section-padding: utility padding is split onto the Section cell', {
    tags: ['conformance:tw-section-padding'],
  }, async () => {
    const html = await render(undefined, h(ESection, { class: 'p-4' }, { default: () => 'Content' }))
    expectMatches(html, 'tw-section-padding')
    expect(html).toContain('<td style="padding:1rem;">Content</td>')
  })

  it('tw-row-classes: row table inlines width and background', {
    tags: ['conformance:tw-row-classes'],
  }, async () => {
    const html = await render(undefined, h(ERow, { class: 'w-full bg-gray-100' }, {
      default: () => h(EColumn, null, { default: () => 'Cell' }),
    }))
    expectMatches(html, 'tw-row-classes', stripColumnDataId)
    expect(html).toContain('style="width:100%;background-color:rgb(243,244,246);"')
  })

  it('moves Tailwind row padding to a presentation cell while retaining table styles', async () => {
    const html = await render(undefined, h(ERow, { class: 'bg-gray-100 p-4' }, {
      default: () => h(EColumn, null, { default: () => 'Cell' }),
    }))

    expect(html).toContain('style="background-color:rgb(243,244,246);"')
    expect(html).toContain('<td style="padding:1rem;"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">')
  })

  it.each([
    ['EContainer', EContainer],
    ['ESection', ESection],
    ['ERow', ERow],
  ] as const)('keeps responsive %s padding as a documented table media rule', async (name, component) => {
    const content = name === 'ERow'
      ? h(EColumn, null, { default: () => 'Cell' })
      : 'Content'
    const html = await render(undefined, h(component, { class: 'md:p-4' }, { default: () => content }))

    expect(html).toContain('class="md_p-4"')
    expect(html).toContain('@media (min-width:48rem){.md_p-4{padding:1rem!important}}')
    expect(html).not.toContain('<td style="padding:1rem;')
  })

  it('tw-column-classes: column cell padding and alignment', {
    tags: ['conformance:tw-column-classes'],
  }, async () => {
    const html = await render(undefined, h(ERow, null, {
      default: () => h(EColumn, { class: 'p-2 text-center' }, { default: () => 'Cell' }),
    }))
    expectMatches(html, 'tw-column-classes', stripColumnDataId)
    expect(html).toContain('<td style="padding:0.5rem;text-align:center;">Cell</td>')
  })

  it('tw-heading-classes: heading font size and weight inlined', {
    tags: ['conformance:tw-heading-classes'],
  }, async () => {
    const html = await render(undefined, h(EHeading, { class: 'text-2xl font-bold' }, { default: () => 'Title' }))
    expectMatches(html, 'tw-heading-classes')
    expect(html).toContain('<h1 style="font-size:1.5rem;line-height:1.3333333333333333;font-weight:700;">Title</h1>')
  })

  it('tw-button-classes: anchor inlines utilities and derives Outlook spacers from padding', {
    tags: ['conformance:tw-button-classes'],
  }, async () => {
    const html = await render(undefined, h(EButton, {
      class: 'bg-blue-600 px-4 py-2 text-white',
      href: 'https://example.com',
    }, { default: () => 'Activate' }))
    expectMatches(html, 'tw-button-classes')
    // The px-4 (16px) padding drives the MSO spacer width; the transform never touches
    // these conditional comments (it works on the VNode tree), so they survive verbatim.
    expect(html).toContain('<!--[if mso]><i style="mso-font-width:400%;mso-text-raise:12px" hidden>&#8202;&#8202;</i><![endif]-->')
    expect(html).toContain('<!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->')
  })

  it('tw-media-queries: non-inlinable rules injected into head style, downleveled and sanitized', {
    tags: ['conformance:tw-media-queries'],
  }, async () => {
    const html = await render(undefined, h('div', { class: 'md:bg-red-500 sm:text-lg' }, 'Content'))
    expectMatches(html, 'tw-media-queries')
    expect(html).toContain('<style>@media (min-width:40rem){.sm_text-lg{font-size:1.125rem!important;line-height:1.5555555555555556!important}}@media (min-width:48rem){.md_bg-red-500{background-color:rgb(251,44,54)!important}}</style>')
    expect(html).toContain('<div class="md_bg-red-500 sm_text-lg">Content</div>')
  })

  it('tw-preserves-head-children: existing head children kept, injected style placed before them', {
    tags: ['conformance:tw-preserves-head-children'],
  }, async () => {
    const html = await render(
      undefined,
      h('div', { class: 'md:bg-red-500' }, 'Content'),
      h(EHead, null, {
        default: () => [
          h('title', null, 'Preserved title'),
          h('style', { innerHTML: 'body{color:#111}' }),
        ],
      }),
    )
    expectMatches(html, 'tw-preserves-head-children')
    expect(html).toContain('<title>Preserved title</title><style>@media (min-width:48rem){.md_bg-red-500{background-color:rgb(251,44,54)!important}}</style><style>body{color:#111}</style>')
  })

  it('tw-residual-class-sanitization: pseudo and fraction classes sanitized on element and in head css', {
    tags: ['conformance:tw-residual-class-sanitization'],
  }, async () => {
    const html = await render(undefined, h('div', { class: 'hover:bg-red-500 md:w-1/2' }, 'Content'))
    expectMatches(html, 'tw-residual-class-sanitization')
    expect(html).toContain('<div class="hover_bg-red-500 md_w-1_2">Content</div>')
    expect(html).toContain('.hover_bg-red-500{@media (hover:hover){&:hover{background-color:rgb(251,44,54)!important}}}')
  })

  it('tw-important: important modifier preserved in inline style', {
    tags: ['conformance:tw-important'],
  }, async () => {
    const html = await render(undefined, h('div', { class: '!text-red-500' }, 'Content'))
    expectMatches(html, 'tw-important')
    expect(html).toContain('<div style="color:rgb(251,44,54)!important;">Content</div>')
  })

  it('tw-duplicate-classes: duplicate class collapses to a single declaration', {
    tags: ['conformance:tw-duplicate-classes'],
  }, async () => {
    const html = await render(undefined, h('div', { class: 'p-4 p-4' }, 'Content'))
    expectMatches(html, 'tw-duplicate-classes')
    expect(html).toContain('<div style="padding:1rem;">Content</div>')
  })

  it('tw-mso-preserved: mso-* author style survives alongside inlined utility', {
    tags: ['conformance:tw-mso-preserved'],
  }, async () => {
    const html = await render(undefined, h('div', { class: 'bg-red-500', style: { msoHide: 'all', color: 'blue' } }, 'Content'))
    expectMatches(html, 'tw-mso-preserved')
    expect(html).toContain('<div style="background-color:rgb(251,44,54);mso-hide:all;color:blue;">Content</div>')
  })

  it('tw-pixel-preset: pixel-based spacing yields px padding instead of rem', {
    tags: ['conformance:tw-pixel-preset'],
  }, async () => {
    const html = await render({ presets: [pixelBasedPreset] }, h('div', { class: 'p-4' }, 'Content'))
    expectMatches(html, 'tw-pixel-preset')
    expect(html).toContain('<div style="padding:16px;">Content</div>')
  })

  it('tw-custom-theme: custom theme color resolves to rgb background', {
    tags: ['conformance:tw-custom-theme'],
  }, async () => {
    const html = await render({ theme: { extend: { colors: { brand: '#123456' } } } }, h('div', { class: 'bg-brand' }, 'Content'))
    expectMatches(html, 'tw-custom-theme')
    expect(html).toContain('<div style="background-color:rgb(18,52,86);">Content</div>')
  })

  it('tw-nested-component: classes produced inside a nested component are inlined, including a nested-only media query', {
    tags: ['conformance:tw-nested-component'],
  }, async () => {
    // A plain function component whose body emits the Tailwind classes. The VNode
    // transform never sees these vnodes; they are reached by primitive self-inlining
    // (Text/Button), the post-render plain-element pass (div), and the post-render
    // head-CSS completion (md:text-lg).
    const NestedComponent = defineComponent({
      name: 'NestedComponent',
      setup() {
        return () => h('div', { class: 'bg-red-500 p-4 md:text-lg' }, [
          h(EText, { class: 'm-0' }, { default: () => 'Nested text' }),
          h(EButton, { class: 'bg-blue-600 px-4 py-2', href: 'https://example.com' }, { default: () => 'Nested button' }),
        ])
      },
    })

    const html = await render(undefined, h(NestedComponent))
    expectMatches(html, 'tw-nested-component')

    // The plain nested div: utilities inlined, md:text-lg sanitized and kept as residual.
    expect(html).toContain('<div class="md_text-lg" style="background-color:rgb(251,44,54);padding:1rem;">')
    // The nested EText: m-0 flows into its margin logic, killing the default 16px margins.
    expect(html).toContain('margin:0rem;margin-top:0rem;margin-bottom:0rem;margin-left:0rem;margin-right:0rem;')
    // The nested EButton: px-4 (16px) drives the Outlook spacer width, derived at render time.
    expect(html).toContain('<!--[if mso]><i style="mso-font-width:400%;mso-text-raise:12px" hidden>&#8202;&#8202;</i><![endif]-->')
    // The nested-only md:text-lg media query reaches the head style.
    expect(html).toContain('<style>@media (min-width:48rem){.md_text-lg{font-size:1.125rem!important;line-height:1.5555555555555556!important}}</style>')
  })

  it('throws React Email\'s exact no-head error when non-inlinable rules have nowhere to go', async () => {
    const fixture = defineComponent({
      name: 'NoHeadFixture',
      setup() {
        return () => h(ETailwind, null, { default: () => h('div', { class: 'md:bg-red-500' }) })
      },
    })
    await expect(renderComponentToHtml(fixture)).rejects.toThrow(
      oracle.errors['tailwind-non-inlinable-without-head'],
    )
  })

  it('lists multiple offending classes in React\'s stylesheet-emission order, not authored order', async () => {
    // Authored `lg hover sm md`; React lists `hover sm md lg` (pseudo-class then ascending
    // breakpoints). The message is asserted whole so a reordering regression fails.
    const fixture = defineComponent({
      name: 'NoHeadMultiFixture',
      setup() {
        return () => h(ETailwind, null, {
          default: () => h('div', { class: 'lg:hidden hover:bg-red-500 sm:text-lg md:w-1/2' }),
        })
      },
    })
    const error = await renderComponentToHtml(fixture).catch(value => value)
    expect(error.message).toBe(oracle.errors['tailwind-non-inlinable-without-head-multi'])
  })
})
