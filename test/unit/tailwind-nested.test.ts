import type { Component } from 'vue'
import { createCommentVNode, defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EBody, EButton, EText } from '../../src/runtime/components'
import { EHead } from '../../src/runtime/components/EHead'
import { EHtml } from '../../src/runtime/components/EHtml'
import { ETailwind } from '../../src/runtime/components/ETailwind'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { TailwindMissingHeadError } from '../../src/runtime/tailwind/transform'

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

describe('nested-component Tailwind', () => {
  it('inlines a class emitted on a plain element inside a nested component', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h('div', { class: 'bg-red-500 p-4' }, 'Deep'),
    ))))
    expect(html).toContain('<div style="background-color:rgb(251,44,54);padding:1rem;">Deep</div>')
    expect(html).not.toContain('class="bg-red-500')
  })

  it('self-inlines a nested EText so its default margins are killed by m-0', async () => {
    const html = await renderComponentToHtml(email(h(nested(() =>
      h(EText, { class: 'm-0' }, { default: () => 'Deep' }),
    ))))
    // m-0 => margin:0rem flows into EText's margin logic, which re-splits all four sides.
    expect(html).toContain('<p style="font-size:14px;line-height:24px;margin:0rem;margin-top:0rem;margin-bottom:0rem;margin-left:0rem;margin-right:0rem;">Deep</p>')
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

  it('throws the exact no-head error when a nested-only class needs a head that does not exist', async () => {
    const fixture = email(h(nested(() => h('div', { class: 'md:bg-red-500' }, 'Deep'))), { head: false })
    await expect(renderComponentToHtml(fixture)).rejects.toThrow(TailwindMissingHeadError)
    await expect(renderComponentToHtml(fixture)).rejects.toThrow(
      'Tailwind: <head> not found inside <Tailwind>.\nMove <Head /> inside <Tailwind>, or remove these classes that require a <head>: md:bg-red-500.',
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
