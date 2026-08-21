import type { Component, VNodeChild } from 'vue'
import oracle from './oracle/react-email-6.9.0.json'
import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import {
  EBody,
  EHead,
  EHeading,
  EHr,
  EHtml,
  EImg,
  ELink,
  EText,
} from '../../src/runtime/components'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'
import { normalizeEmailHtml } from './normalize'

function componentFixture(
  component: Component,
  attributes: Record<string, unknown> = {},
  children?: VNodeChild,
): Component {
  return defineComponent({
    name: 'ComponentFixture',
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

function neutralizeReactLinkDefaults(html: string): string {
  return html
    .replaceAll('color:#067df7;', '')
    .replaceAll('text-decoration-line:none', '')
    .replaceAll(' style=""', '')
}

const CompleteBasicEmail = defineComponent({
  name: 'CompleteBasicEmail',
  setup() {
    return () => h(EHtml, { lang: 'en' }, {
      default: () => [
        h(EHead, null, {
          default: () => [
            h('title', 'Internal title'),
            h('style', 'body{color:#111}'),
          ],
        }),
        h(EBody, { style: { backgroundColor: '#f4f4f4', padding: '20px' } }, {
          default: () => [
            h(EHeading, {
              as: 'h2',
              style: { marginLeft: '4px', marginRight: '4px' },
            }, { default: () => 'Welcome Ada' }),
            h(EText, null, { default: () => 'Hello & <Ada> — Grüß dich' }),
            h(ELink, { href: 'https://example.com/?value="quoted"&mode=test' }, { default: () => 'Open account' }),
            h(EImg, { alt: 'Nuxt logo', height: '32', src: 'https://example.com/logo.png', width: '32' }),
            h(EHr),
          ],
        }),
      ],
    })
  },
})

describe('document primitives', () => {
  it('renders explicit EHtml language, defaults dir, and forwards attributes', {
    tags: ['conformance:html-defaults'],
  }, async () => {
    const defaults = await renderComponent(EHtml, { lang: 'en' })
    const overrides = await renderComponent(EHtml, {
      'data-description': 'French & "quoted"',
      'dir': 'rtl',
      'lang': 'fr',
      'style': { backgroundColor: 'white' },
    }, 'Bonjour & bienvenue')

    expect(defaults).toContain('<html dir="ltr" lang="en"></html>')
    expect(overrides).toContain('<html data-description="French &amp; &quot;quoted&quot;" style="background-color:white;" dir="rtl" lang="fr">')
    expect(overrides).toContain('Bonjour &amp; bienvenue')
  })

  it('rejects a missing or empty EHtml language', async () => {
    await expect(renderComponent(EHtml))
      .rejects.toThrow('EHtml lang must be a non-empty string')
    await expect(renderComponent(EHtml, { lang: '' }))
      .rejects.toThrow('EHtml lang must be a non-empty string')
    await expect(renderComponent(EHtml, { lang: '   ' }))
      .rejects.toThrow('EHtml lang must be a non-empty string')
  })

  it('renders EHead metadata before user content and matches the oracle', {
    tags: ['conformance:head-content'],
  }, async () => {
    const html = await renderComponent(
      EHead,
      { id: 'head-test' },
      h('style', 'body{color:red}'),
    )

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['head-content'].html))
    expect(html.indexOf('http-equiv="Content-Type"')).toBeLessThan(html.indexOf('x-apple-disable-message-reformatting'))
    expect(html.indexOf('x-apple-disable-message-reformatting')).toBeLessThan(html.indexOf('<style>'))
  })

  it('renders an empty EHead without Vue placeholders', async () => {
    const html = await renderComponent(EHead)

    expect(html).toContain('<head><meta content="text/html; charset=UTF-8" http-equiv="Content-Type"><meta name="x-apple-disable-message-reformatting"></head>')
    expect(html).not.toContain('<!---->')
  })

  it('renders EBody with the presentation table and exact style placement', {
    tags: ['conformance:body-reset'],
  }, async () => {
    const html = await renderComponent(EBody, {
      id: 'body-test',
      style: { backgroundColor: 'pink', color: 'navy', marginInlineStart: '12px', padding: '20px' },
    }, 'Body content')

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['body-reset'].html))
    expect(html).toContain('<body id="body-test" dir="ltr" lang="en" style="background-color:pink;margin-inline-start:0;padding:0;">')
    expect(html).toContain('<td dir="ltr" lang="en" style="background-color:pink;color:navy;margin-inline-start:12px;padding:20px;">Body content</td>')
  })

  it.each([
    { 'background-color': 'pink', 'margin-inline-start': '12px', 'padding': '20px' },
    'background-color:pink;margin-inline-start:12px;padding:20px',
  ])('normalizes Vue static and dynamic EBody style forms', async (style) => {
    const html = await renderComponent(EBody, { style }, 'Body content')

    expect(html).toContain('<body dir="ltr" lang="en" style="background-color:pink;margin-inline-start:0;padding:0;">')
    expect(html).toContain('<td dir="ltr" lang="en" style="background-color:pink;margin-inline-start:12px;padding:20px')
  })

  const resetProperties = [
    'margin',
    'marginTop',
    'marginBottom',
    'marginRight',
    'marginLeft',
    'marginInline',
    'marginBlock',
    'marginBlockStart',
    'marginBlockEnd',
    'marginInlineStart',
    'marginInlineEnd',
    'padding',
    'paddingTop',
    'paddingBottom',
    'paddingRight',
    'paddingLeft',
    'paddingInline',
    'paddingBlock',
    'paddingBlockStart',
    'paddingBlockEnd',
    'paddingInlineStart',
    'paddingInlineEnd',
  ]

  it.each(resetProperties)('resets EBody %s while preserving it on the inner cell', async (property) => {
    const cssProperty = property.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
    const html = await renderComponent(EBody, { style: { [property]: '10px' } }, 'Content')
    const bodyTag = html.match(/<body[^>]*>/)?.[0]
    const cellTag = html.match(/<td[^>]*>/)?.[0]

    expect(bodyTag).toContain(`${cssProperty}:0`)
    expect(cellTag).toContain(`${cssProperty}:10px`)
  })

  it('mirrors EBody direction and language onto the inner cell', async () => {
    const html = await renderComponent(EBody, { dir: 'rtl', lang: 'ar' })

    expect(html).toContain('<body dir="rtl" lang="ar">')
    expect(html).toContain('<td dir="rtl" lang="ar"></td>')
  })
})

describe('content primitives', () => {
  it('renders empty EText content with default typography', async () => {
    const html = await renderComponent(EText)

    expect(html).toContain('<p style="font-size:14px;line-height:24px;margin-top:16px;margin-bottom:16px;"></p>')
  })

  it('matches EText typography and ordered margin behavior', {
    tags: ['conformance:text-margins'],
  }, async () => {
    const html = await renderComponent(EText, {
      id: 'text-test',
      style: { color: 'red', margin: '12px', marginTop: '0px' },
    }, 'Text content')

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['text-margins'].html))
  })

  it('normalizes compiled static EText styles before applying margin defaults', async () => {
    const html = await renderComponent(EText, {
      style: { 'color': 'red', 'margin': '12px', 'margin-top': '0px' },
    }, 'Static style')

    expect(html).toContain('style="font-size:14px;line-height:24px;color:red;margin:12px;margin-top:0px;margin-bottom:12px;margin-left:12px;margin-right:12px;"')
  })

  it('renders every EHeading tag with ordinary Vue styles', async () => {
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
      const html = await renderComponent(EHeading, {
        as: tag,
        style: { marginLeft: '4px', marginRight: '4px' },
      }, tag)
      expect(html).toContain(`<${tag} style="margin-left:4px;margin-right:4px;">${tag}</${tag}>`)
      expect(html).not.toMatch(/\sas=/)
    }
  })

  it('defaults EHeading to an empty h1', async () => {
    expect(await renderComponent(EHeading)).toContain('<h1></h1>')
  })

  it('rejects an unsafe dynamic EHeading tag at runtime', async () => {
    await expect(renderComponent(EHeading, { as: 'script' }, 'unsafe()'))
      .rejects.toThrow('EHeading as must be one of h1, h2, h3, h4, h5, h6; received script')
  })

  it('matches EHeading tag selection and Vue style forwarding', {
    tags: ['conformance:heading-style'],
  }, async () => {
    const html = await renderComponent(EHeading, {
      id: 'heading-test',
      as: 'h2',
      style: { color: 'red', marginLeft: '4px', marginRight: '9px', marginTop: '5px' },
    }, 'Heading content')

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['heading-style'].html))
  })

  it('renders ELink defaults, overrides, forwarding, and escaped content', {
    tags: ['conformance:link-overrides'],
  }, async () => {
    const defaults = await renderComponent(ELink, { href: 'https://example.com' }, 'Example')
    const oracleOverrides = await renderComponent(ELink, {
      id: 'link-test',
      href: 'https://example.com/?value="quoted"&mode=test',
      style: { color: 'red' },
      target: '_self',
    }, 'Link & content')
    const overrides = await renderComponent(ELink, {
      'aria-label': 'Open & inspect',
      'id': 'link-test',
      'href': 'https://example.com/?value="quoted"&mode=test',
      'rel': 'noreferrer',
      'style': { color: 'red' },
      'target': '_self',
    }, 'Link & content')

    expect(normalizeEmailHtml(oracleOverrides)).toBe(
      normalizeEmailHtml(neutralizeReactLinkDefaults(oracle.cases['link-overrides'].html)),
    )
    expect(defaults).toContain('<a href="https://example.com" target="_blank">Example</a>')
    expect(defaults).not.toContain('style=')
    expect(overrides).toContain('href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"')
    expect(overrides).toContain('aria-label="Open &amp; inspect"')
    expect(overrides).toContain('rel="noreferrer"')
    expect(overrides).toContain('style="color:red;"')
    expect(overrides).toContain('target="_self"')
    expect(overrides).toContain('>Link &amp; content</a>')
  })

  it('rejects a missing or empty ELink destination', async () => {
    await expect(renderComponent(ELink))
      .rejects.toThrow('ELink href must be a non-empty string')
    await expect(renderComponent(ELink, { href: '' }))
      .rejects.toThrow('ELink href must be a non-empty string')
  })

  it('renders EImg attributes, explicit decorative alt text, and client-safe styles', {
    tags: ['conformance:image-overrides'],
  }, async () => {
    const emptyAlt = await renderComponent(EImg, { alt: '', src: 'logo.png' })
    const html = await renderComponent(EImg, {
      id: 'img-test',
      alt: 'Logo & mark',
      height: '120',
      src: 'https://example.com/logo.png?mode=light&size=2',
      style: { border: '1px solid black' },
      width: '300',
    })

    expect(normalizeEmailHtml(html)).toBe(normalizeEmailHtml(oracle.cases['image-overrides'].html))
    expect(emptyAlt).toMatch(/<img[^>]*\salt(?:=""|(?=\s|>))/)
    expect(html).toContain('alt="Logo &amp; mark"')
    expect(html).toContain('src="https://example.com/logo.png?mode=light&amp;size=2"')
    expect(html).toContain('height="120"')
    expect(html).toContain('width="300"')
    expect(html).toContain('id="img-test"')
    expect(html).toContain('style="display:block;outline:none;border:1px solid black;text-decoration:none;"')
  })

  it('rejects missing image accessibility and source props', async () => {
    await expect(renderComponent(EImg, { src: 'logo.png' }))
      .rejects.toThrow('EImg alt must be a string')
    await expect(renderComponent(EImg, { alt: 'Logo' }))
      .rejects.toThrow('EImg src must be a non-empty string')
    await expect(renderComponent(EImg, { alt: 'Logo', src: '' }))
      .rejects.toThrow('EImg src must be a non-empty string')
  })

  it('renders EHr defaults and user style precedence', {
    tags: ['conformance:horizontal-rule-overrides'],
  }, async () => {
    const defaults = await renderComponent(EHr)
    const overrides = await renderComponent(EHr, {
      id: 'hr-test',
      style: { borderColor: 'black', width: '50%' },
    })

    expect(defaults).toContain('style="width:100%;border:none;border-color:transparent;border-top:1px solid #eaeaea;"')
    expect(normalizeEmailHtml(overrides)).toBe(normalizeEmailHtml(oracle.cases['horizontal-rule-overrides'].html))
  })

  it('rejects raw HTML before it can replace safe component structure', async () => {
    await expect(renderComponent(EBody, { innerHTML: '<script>unsafe()</script>' }))
      .rejects.toThrow('EBody does not support unsafe HTML attribute: innerHTML')
  })
})

describe('complete Phase 1 email', () => {
  it('renders deterministic server-only HTML and exact oracle plain text', {
    tags: [
      'conformance:complete-basic-email',
      'conformance:complete-basic-email-text',
    ],
  }, async () => {
    const first = await renderEmailComponent(CompleteBasicEmail)
    const second = await renderEmailComponent(CompleteBasicEmail)

    expect(first).toEqual(second)
    expect(normalizeEmailHtml(first.html)).toBe(
      normalizeEmailHtml(neutralizeReactLinkDefaults(oracle.cases['complete-basic-email'].html)),
    )
    expect(first.text).toBe(oracle.cases['complete-basic-email-text'].text)
    expect(first.html).toContain(oracle.cases['complete-basic-email'].expectedExactFragments[0])
    expect(first.html).toContain('Hello &amp; &lt;Ada&gt; — Grüß dich')
    expect(first.html).toContain('href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"')
    expect(first.html).not.toContain('data-v-app')
    expect(first.html).not.toContain('<script')
    expect(first.html).not.toContain('__NUXT__')
  })
})
