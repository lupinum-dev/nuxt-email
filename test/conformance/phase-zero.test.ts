import type { Component } from 'vue'
import oracle from './oracle/react-email-6.9.0.json'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { normalizeEmailHtml } from './normalize'

const BasicDocument = defineComponent({
  name: 'BasicDocument',
  setup() {
    return () => h('html', { dir: 'ltr', lang: 'en' }, [
      h('head', [
        h('meta', { 'content': 'text/html; charset=UTF-8', 'http-equiv': 'Content-Type' }),
        h('meta', { name: 'x-apple-disable-message-reformatting' }),
      ]),
      h('body', { dir: 'ltr', lang: 'en' }, [
        h('table', {
          border: 0,
          width: '100%',
          cellpadding: '0',
          cellspacing: '0',
          role: 'presentation',
          align: 'center',
        }, [
          h('tbody', [
            h('tr', [
              h('td', { dir: 'ltr', lang: 'en' }, [
                h('p', {
                  style: {
                    fontSize: '14px',
                    lineHeight: '24px',
                    marginTop: '16px',
                    marginBottom: '16px',
                  },
                }, 'Hello & <Ada> — Grüß dich'),
                h('a', { href: 'https://example.com/?value="quoted"&mode=test' }, 'Open'),
              ]),
            ]),
          ]),
        ]),
      ]),
    ])
  },
})

const PropsDocument = defineComponent({
  name: 'PropsDocument',
  props: {
    enabled: Boolean,
    items: {
      type: Array<string>,
      required: true,
    },
  },
  setup(props) {
    return () => h('main', [
      props.enabled ? h('strong', 'enabled') : null,
      ...props.items.map(item => h('span', { 'data-item': item }, item)),
    ])
  },
})

describe('phase zero rendering proof', () => {
  it('matches the pinned React Email document after narrow normalization', async () => {
    const vueHtml = await renderComponentToHtml(BasicDocument)
    const normalizedVue = normalizeEmailHtml(vueHtml)

    expect(normalizedVue).toBe(normalizeEmailHtml(oracle.cases['basic-document']))
    expect(normalizedVue).toContain('<html dir="ltr" lang="en"><head>')
    expect(normalizedVue).toContain('<body dir="ltr" lang="en"><table border="0" width="100%" cellpadding="0" cellspacing="0" role="presentation" align="center"><tbody><tr><td dir="ltr" lang="en">')
    expect(vueHtml).toContain('Hello &amp; &lt;Ada&gt; — Grüß dich')
    expect(vueHtml).toContain('href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"')
  })

  it('renders props, conditions, and repeated content deterministically', async () => {
    const props = { enabled: true, items: ['one', 'two'] }
    const first = await renderComponentToHtml(PropsDocument, props)
    const second = await renderComponentToHtml(PropsDocument, props)

    expect(first).toBe(second)
    expect(first).toContain('<strong>enabled</strong>')
    expect(first).toContain('<span data-item="one">one</span><span data-item="two">two</span>')
  })

  it('preserves Vue rendering errors', async () => {
    const BrokenDocument: Component = defineComponent({
      name: 'BrokenDocument',
      setup() {
        throw new Error('fixture failed')
      },
    })

    await expect(renderComponentToHtml(BrokenDocument)).rejects.toThrow('fixture failed')
  })

  it('rejects undeclared props instead of leaking them into root attributes', async () => {
    await expect(renderComponentToHtml(BasicDocument, { secret: 'TOP-SECRET' }))
      .rejects.toThrow('Unknown email component prop: secret')
  })
})

describe('email HTML normalization', () => {
  it('removes only known React boundary markers and serializer noise', () => {
    const input = '<!--$--><!--html--><table cellPadding="0" cellSpacing="0"><tr><td style="color:red;"><meta name="x" /></td></tr></table><!--/$-->'

    expect(normalizeEmailHtml(input)).toBe('<table cellpadding="0" cellspacing="0"><tr><td style="color:red"><meta name="x"></td></tr></table>')
  })

  it('preserves MSO conditionals, text, URLs, and child order', () => {
    const input = '<!--[if mso]><i>left</i><![endif]--><a href="https://example.com/?cellPadding=0&amp;value=style=&quot;x;&quot;">second </a> <span data-value="x > y">third cellSpacing=</span>'

    expect(normalizeEmailHtml(input)).toBe(input)
  })
})
