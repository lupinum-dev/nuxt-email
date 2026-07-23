import type { Component } from 'vue'
import { createCommentVNode, defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EBody, EButton, EColumn, ERow, EText } from '../../src/runtime/components'
import { EHead } from '../../src/runtime/components/EHead'
import { EHtml } from '../../src/runtime/components/EHtml'
import { ETailwind } from '../../src/runtime/components/ETailwind'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { TailwindMissingHeadError } from '../../src/runtime/tailwind/errors'

/** Wrap a nested body component in <ETailwind><EHtml><EHead/><EBody>…. */
function email(body: unknown, options: { head?: boolean } = {}): Component {
  return defineComponent({
    name: 'NestedEmailFixture',
    setup() {
      return () => h(ETailwind, null, {
        default: () => h(EHtml, null, {
          default: () => [
            ...(options.head === false ? [] : [h(EHead)]),
            h(EBody, null, { default: () => body }),
          ],
        }),
      })
    },
  })
}

/** A component (not the SFC template) whose render emits the given children. */
function nested(render: () => unknown): Component {
  return defineComponent({ name: 'Nested', setup: () => render })
}

/** Put the entire email document behind one nested layout component. */
function nestedDocument(render: () => unknown): Component {
  const Layout = nested(render)
  return defineComponent({
    name: 'NestedDocumentEmailFixture',
    setup: () => () => h(ETailwind, null, { default: () => h(Layout) }),
  })
}

describe('nested-component Tailwind', () => {
  it('invokes nested slots exactly once', async () => {
    let calls = 0
    const Child = defineComponent({
      name: 'SlottedChild',
      setup(_props, { slots }) {
        return () => h('div', slots.default?.())
      },
    })

    const html = await renderComponentToHtml(email(h(Child, null, {
      default: () => {
        calls++
        return h('span', { class: 'p-1' }, String(calls))
      },
    })))

    expect(calls).toBe(1)
    expect(html).toContain('<span style="padding:0.25rem;">1</span>')
  })

  it('preserves scoped-slot props', async () => {
    const Child = defineComponent({
      name: 'ScopedSlottedChild',
      setup(_props, { slots }) {
        return () => h('div', slots.default?.({ item: 'Scoped value' }))
      },
    })

    const html = await renderComponentToHtml(email(h(Child, null, {
      default: ({ item }: { item: string }) => h('span', { class: 'p-1' }, item),
    })))

    expect(html).toContain('<span style="padding:0.25rem;">Scoped value</span>')
  })

  it('inlines a class emitted on a plain element inside a nested component', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h('div', { class: 'bg-red-500 p-4' }, 'Deep'),
    ))))
    expect(html).toContain('<div style="background-color:rgb(251,44,54);padding:1rem;">Deep</div>')
    expect(html).not.toContain('class="bg-red-500')
  })

  it('re-escapes residual class names when rewriting a nested plain element', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h('div', { class: `p-4 safe'" data-pwn="yes` }, 'Deep'),
    ))))

    expect(html).toContain('class="safe&#39;&quot; data-pwn=&quot;yes"')
    expect(html).not.toContain('<div class="safe" data-pwn="yes"')
    expect(html).toContain('style="padding:1rem;"')
  })

  it('preserves quoted URLs and data-URI semicolons in nested author styles', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h('div', {
        class: 'p-4',
        style: {
          backgroundImage: 'url("https://example.com/image.svg?x=1&y=2")',
          borderImageSource: 'url(data:image/svg+xml;base64,PHN2Zz4=)',
          fontFamily: '"A&B", sans-serif',
        },
      }, 'Deep'),
    ))))

    expect(html).toContain('padding:1rem;')
    expect(html).toContain('background-image:url(https://example.com/image.svg?x=1&amp;y=2);')
    expect(html).toContain('border-image-source:url(data:image/svg+xml;base64,PHN2Zz4=);')
    expect(html).toContain('font-family:&quot;A&amp;B&quot;,sans-serif;')
  })

  it('self-inlines a nested EText so its default margins are killed by m-0', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h(EText, { class: 'm-0' }, { default: () => 'Deep' }),
    ))))
    // m-0 => margin:0rem flows into EText's margin logic, which re-splits all four sides.
    expect(html).toContain('<p style="font-size:14px;line-height:24px;margin:0rem;margin-top:0rem;margin-bottom:0rem;margin-left:0rem;margin-right:0rem;">Deep</p>')
  })

  it('self-inlines a nested EBody before deriving its reset and wrapper styles', async () => {
    const html = await renderComponentToHtml(nestedDocument(() => h(EHtml, null, {
      default: () => [
        h(EHead),
        h(EBody, { class: 'p-4' }, { default: () => h('p', 'Deep') }),
      ],
    })))

    expect(html).toContain('<body dir="ltr" lang="en" style="padding:0;">')
    expect(html).toContain('<td dir="ltr" lang="en" style="padding:1rem;"><p>Deep</p></td>')
    expect(html).not.toContain('class="p-4"')
  })

  it('self-inlines a nested EButton so Outlook spacers reflect the utility padding', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h(EButton, { class: 'px-4 py-2', href: 'https://example.com' }, { default: () => 'Deep' }),
    ))))
    // px-4 = 16px horizontal padding => 400% mso-font-width; py-2 = 8px => 12px text-raise.
    expect(html).toContain('padding-right:16px;padding-left:16px;padding-bottom:8px;padding-top:8px;')
    expect(html).toContain('<!--[if mso]><i style="mso-font-width:400%;mso-text-raise:12px" hidden>&#8202;&#8202;</i><![endif]-->')
    expect(html).toContain('<!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->')
  })

  it('self-inlines nested ERow padding onto its presentation-cell wrapper', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h(ERow, { class: 'px-4 py-2' }, {
        default: () => h(EColumn, null, { default: () => 'Deep' }),
      }),
    ))))

    expect(html).toContain('<td style="padding-right:1rem;padding-left:1rem;padding-bottom:0.5rem;padding-top:0.5rem;"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">')
    expect(html).not.toContain('class="px-4 py-2"')
  })

  it('leftover pass preserves an MSO conditional comment byte-for-byte while inlining a sibling class', async () => {
    const msoComment = '[if mso]><table role="presentation" width="100%"><tr><td style="padding:0">raw</td></tr></table><![endif]'
    const html = await renderComponentToHtml(email(h(nested(() =>
      h('div', { class: 'bg-red-500' }, [
        createCommentVNode(msoComment),
        h('span', { class: 'p-4' }, 'x'),
      ]),
    ))))
    // The class-bearing siblings are inlined...
    expect(html).toContain('<div style="background-color:rgb(251,44,54);">')
    expect(html).toContain('<span style="padding:1rem;">x</span>')
    // ...but the MSO comment (whose interior looks like elements with attributes) is untouched.
    expect(html).toContain(`<!--${msoComment}-->`)
  })

  it('reaches the head with a nested-only media query', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h('div', { class: 'md:bg-red-500' }, 'Deep'),
    ))))
    expect(html).toContain('<style>@media (min-width:48rem){.md_bg-red-500{background-color:rgb(251,44,54)!important}}</style>')
    expect(html).toContain('<div class="md_bg-red-500">Deep</div>')
  })

  it('inserts responsive CSS when a nested layout emits the whole document and head', async () => {
    const html = await renderComponentToHtml(nestedDocument(() => h(EHtml, null, {
      default: () => [
        h(EHead),
        h(EBody, null, {
          default: () => h('div', { class: 'md:bg-red-500' }, 'Deep'),
        }),
      ],
    })))

    expect(html).toContain('<style>@media (min-width:48rem){.md_bg-red-500{background-color:rgb(251,44,54)!important}}</style>')
    expect(html).toContain('<div class="md_bg-red-500">Deep</div>')
  })

  it('ignores style-like markup inside a head comment when inserting nested CSS', async () => {
    const conditional = '[if mso]><style>.mso{color:red}</style><![endif]'
    const html = await renderComponentToHtml(nestedDocument(() => h(EHtml, null, {
      default: () => [
        h(EHead, null, { default: () => createCommentVNode(conditional) }),
        h(EBody, null, {
          default: () => h('div', { class: 'md:bg-red-500' }, 'Deep'),
        }),
      ],
    })))

    expect(html).toContain(`<!--${conditional}--><style>@media (min-width:48rem)`)
    expect(html).toContain(`<!--${conditional}-->`)
  })

  it('never mistakes a direct body style for the document head style', async () => {
    const html = await renderComponentToHtml(nestedDocument(() => h('html', [
      h('head'),
      h('body', [
        h('style', { innerHTML: '.author{color:red}' }),
        h('div', { class: 'md:bg-red-500' }, 'Deep'),
      ]),
    ])))

    expect(html).toContain('<head><style>@media (min-width:48rem)')
    expect(html).toContain('</style></head><body><style>.author{color:red}</style>')
  })

  it('rejects nested ETailwind boundaries instead of applying the wrong config', async () => {
    const fixture = defineComponent({
      name: 'NestedTailwindBoundaryFixture',
      setup: () => () => h(ETailwind, null, {
        default: () => h(EHtml, null, {
          default: () => [
            h(EHead),
            h(EBody, null, {
              default: () => h(ETailwind, null, {
                default: () => h('div', { class: 'p-4' }, 'Deep'),
              }),
            }),
          ],
        }),
      }),
    })

    await expect(renderComponentToHtml(fixture)).rejects.toThrow(
      'ETailwind boundaries cannot be nested; wrap the email document in one ETailwind boundary.',
    )
  })

  it('throws the exact no-head error when a nested-only class needs a head that does not exist', async () => {
    const fixture = email(h(nested(() => h('div', { class: 'md:bg-red-500' }, 'Deep'))), { head: false })
    await expect(renderComponentToHtml(fixture)).rejects.toThrow(TailwindMissingHeadError)
    await expect(renderComponentToHtml(fixture)).rejects.toThrow(
      'Tailwind: <head> not found inside <Tailwind>.\nMove <Head /> inside <Tailwind>, or remove these classes that require a <head>: md:bg-red-500.',
    )
  })

  it('does not use a document head outside the ETailwind boundary', async () => {
    const Deep = nested(() => h('div', { class: 'md:bg-red-500' }, 'Deep'))
    const fixture = defineComponent({
      name: 'OutsideHeadFixture',
      setup: () => () => h(EHtml, null, {
        default: () => [
          h(EHead),
          h(EBody, null, {
            default: () => h(ETailwind, null, { default: () => h(Deep) }),
          }),
        ],
      }),
    })

    await expect(renderComponentToHtml(fixture)).rejects.toThrow(
      'Tailwind: <head> not found inside <Tailwind>.',
    )
  })

  it('does not treat head markup inside a comment as a real head', async () => {
    const fixture = email([
      createCommentVNode('<head></head>'),
      h(nested(() => h('div', { class: 'md:bg-red-500' }, 'Deep'))),
    ], { head: false })

    await expect(renderComponentToHtml(fixture)).rejects.toThrow(
      'Tailwind: <head> not found inside <Tailwind>.',
    )
  })

  it('strips every region marker and the style placeholder from the final output', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h('div', { class: 'bg-red-500 md:bg-red-500' }, 'Deep'),
    ))))
    expect(html).not.toContain('nuxt-email-tw')
    expect(html).not.toContain('nuxt-email-tw-css')
    expect(html).not.toContain('<!--nuxt-email-tw')
  })

  it('does not double-process a slot-visible element mixed with a nested one', async () => {
    // Slot-visible div (handled by the VNode transform) alongside a nested div
    // (handled post-render). Both inline identically; the slot-visible one keeps a
    // single style and no leftover class.
    const html = await renderComponentToHtml(email([
      h('div', { class: 'p-4' }, 'Slot'),
      h(nested(() => h('div', { class: 'p-4' }, 'Deep'))),
    ]))
    expect(html).toContain('<div style="padding:1rem;">Slot</div>')
    expect(html).toContain('<div style="padding:1rem;">Deep</div>')
    expect(html).not.toContain('class="p-4"')
    // No stray double style attribute on the slot-visible element.
    expect(html).not.toContain('style="padding:1rem;padding:1rem;"')
  })
})

describe('zero-cost outside a Tailwind region', () => {
  it('leaves a nested primitive with a raw class untouched when there is no ETailwind', async () => {
    const plain = defineComponent({
      name: 'PlainEmail',
      setup() {
        return () => h(EHtml, null, {
          default: () => [
            h(EHead),
            h(EBody, null, {
              default: () => h(nested(() => h(EText, { class: 'm-0' }, { default: () => 'x' }))),
            }),
          ],
        })
      },
    })
    const first = await renderComponentToHtml(plain)
    const second = await renderComponentToHtml(plain)
    expect(first).toBe(second)
    // No injection: EText's self-inline is a no-op — raw class kept, default margins intact.
    expect(first).toContain('<p class="m-0" style="font-size:14px;line-height:24px;margin-top:16px;margin-bottom:16px;">x</p>')
    expect(first).not.toContain('<style>')
  })
})
