import { describe, expect, it } from 'vitest'
import type { PortedCase, PortedErrorCase } from './ported'
import { expectPortedCase, renderPortedCases, renderPortedErrors } from './ported'

const doctype = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'
const metaTags = '<meta content="text/html; charset=UTF-8" http-equiv="Content-Type"><meta name="x-apple-disable-message-reformatting">'
const previewStyle = 'style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0;"'
const filler = '\u00A0\u200C\u200B\u200D\u200E\u200F\uFEFF'

const cases: PortedCase[] = [
  {
    name: 'minimal',
    body: '<EText>Hello</EText>',
    contains: [doctype, `<html dir="ltr" lang="en"><head>${metaTags}</head><body dir="ltr" lang="en">`],
    // An empty head must not leave Vue's `<!---->` placeholder behind.
    excludes: ['<!---->', '<style'],
  },
  {
    name: 'escaping',
    body: '<EText>Hello &amp; &lt;Ada&gt; — Grüß dich</EText><ELink href=\'https://example.com/?value="quoted"&amp;mode=test\'>Open</ELink>',
    contains: ['Hello &amp; &lt;Ada&gt; — Grüß dich', 'href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"'],
  },
  {
    name: 'props-conditions-repeats',
    script: 'defineProps<{ enabled: boolean, items: string[] }>()',
    body: '<strong v-if="enabled">enabled</strong><span v-for="item in items" :key="item" :data-item="item">{{ item }}</span>',
    props: { enabled: true, items: ['one', 'two'] },
    contains: ['<strong>enabled</strong>', '<span data-item="one">one</span><span data-item="two">two</span>'],
  },
  {
    name: 'complete-email',
    email: ':style="{ backgroundColor: \'#f4f4f4\', padding: \'20px\' }"',
    head: '<title>Internal title</title><component is="style">body{color:#111}</component>',
    body: [
      '<EHeading as="h2" :style="{ marginLeft: \'4px\', marginRight: \'4px\' }">Welcome Ada</EHeading>',
      '<EText>Hello &amp; &lt;Ada&gt; — Grüß dich</EText>',
      '<ELink href=\'https://example.com/?value="quoted"&amp;mode=test\'>Open account</ELink>',
      '<EImg alt="Nuxt logo" height="32" src="https://example.com/logo.png" width="32" />',
      '<EHr />',
    ].join(''),
    text: 'WELCOME ADA\n\nHello & <Ada> — Grüß dich\n\nOpen account https://example.com/?value="quoted"&mode=test\n\n----------------------------------------',
    contains: [
      doctype,
      '<title>Internal title</title><style>body{color:#111}</style></head>',
      'Hello &amp; &lt;Ada&gt; — Grüß dich',
      'href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"',
    ],
    excludes: ['data-v-app', '<script', '__NUXT__'],
  },
  {
    // Slot content comes after the two meta tags, in the order it was written.
    name: 'head-slot-order',
    head: '<title>Internal title</title><meta name="robots" content="noindex">',
    body: '<EText>Head</EText>',
    contains: [`${metaTags}<title>Internal title</title><meta name="robots" content="noindex"></head>`],
  },
  {
    name: 'body-style-placement',
    email: 'id="body-test" :style="{ backgroundColor: \'pink\', color: \'navy\', marginInlineStart: \'12px\', padding: \'20px\' }"',
    body: 'Body content',
    contains: [
      'id="body-test"',
      'style="background-color:pink;margin-inline-start:0;padding:0;"',
      'style="background-color:pink;color:navy;margin-inline-start:12px;padding:20px;">Body content</td>',
    ],
  },
  {
    name: 'body-style-static',
    email: 'style="background-color: pink; margin-inline-start: 12px; padding: 20px"',
    body: 'Body content',
    contains: [
      '<body dir="ltr" lang="en" style="background-color:pink;margin-inline-start:0;padding:0;">',
      '<td dir="ltr" lang="en" style="background-color:pink;margin-inline-start:12px;padding:20px;">Body content</td>',
    ],
    golden: false,
  },
  {
    name: 'body-style-string',
    email: ':style="\'background-color:pink;margin-inline-start:12px;padding:20px\'"',
    body: 'Body content',
    contains: [
      '<body dir="ltr" lang="en" style="background-color:pink;margin-inline-start:0;padding:0;">',
      '<td dir="ltr" lang="en" style="background-color:pink;margin-inline-start:12px;padding:20px',
    ],
    golden: false,
  },
  {
    name: 'direction-and-language',
    lang: 'ar',
    email: 'dir="rtl"',
    body: '<EText>مرحبا</EText>',
    contains: ['<html dir="rtl" lang="ar">', '<body dir="rtl" lang="ar">', '<td dir="rtl" lang="ar">'],
  },
  {
    // EEmail renders <html> itself, so attributes passed to EEmail land on <body>.
    name: 'attributes-go-to-body',
    lang: 'fr',
    email: 'id="mail" data-description=\'French &amp; "quoted"\' class="brand"',
    body: 'Bonjour &amp; bienvenue',
    contains: ['<html dir="ltr" lang="fr">', 'data-description="French &amp; &quot;quoted&quot;"', 'id="mail"', 'class="brand"', 'Bonjour &amp; bienvenue'],
  },
  {
    name: 'preview-short',
    email: 'preview="Inbox preview"',
    body: '<EText>Visible</EText>',
    contains: [previewStyle, 'data-skip-in-text="true"', `>Inbox preview<div>${filler}`],
    excludes: ['<title>'],
    text: 'Visible',
  },
  {
    name: 'preview-only',
    email: 'preview="Inbox preview"',
    body: '',
    text: '',
    golden: false,
  },
  {
    // The preview fits 200 characters; 199 get one filler sequence, 200 none.
    name: 'preview-199',
    email: ':preview="\'x\'.repeat(199)"',
    body: '',
    contains: [`>${'x'.repeat(199)}<div>${filler}</div>`],
    golden: false,
  },
  {
    name: 'preview-200',
    email: ':preview="\'x\'.repeat(200)"',
    body: '',
    contains: [`>${'x'.repeat(200)}</div>`],
    golden: false,
  },
  {
    // An emoji across the limit is dropped; React Email emitted a split surrogate here.
    name: 'preview-emoji-boundary',
    email: ':preview="\'x\'.repeat(199) + \'😀\'"',
    body: '',
    contains: [`>${'x'.repeat(199)}<div>${filler}</div>`],
    excludes: ['😀', '�'],
    golden: false,
  },
  {
    // Longer previews are cut to 200 characters.
    name: 'preview-truncated',
    email: ':preview="\'x\'.repeat(250)"',
    body: '',
    contains: [`>${'x'.repeat(200)}</div>`],
    excludes: ['x'.repeat(201)],
    golden: false,
  },
  {
    name: 'international-content',
    body: '<EText>{{ \'こんにちは مرحبا Привет 😀 <b>&\' }}</EText>',
    contains: ['こんにちは مرحبا Привет 😀 &lt;b&gt;&amp;'],
    golden: false,
  },
  {
    // Long multi-byte content renders in full.
    name: 'high-byte-content',
    body: '<EText>{{ \'é\'.repeat(20000) + \'end\' }}</EText>',
    contains: [`${'é'.repeat(20000)}end</p>`],
    golden: false,
  },
  {
    name: 'preview-escaping',
    email: 'preview="Safe &amp; escaped"',
    body: '',
    contains: ['Safe &amp; escaped'],
    golden: false,
  },
]

const reset = [
  'margin', 'marginTop', 'marginBottom', 'marginRight', 'marginLeft', 'marginInline', 'marginBlock',
  'marginBlockStart', 'marginBlockEnd', 'marginInlineStart', 'marginInlineEnd',
  'padding', 'paddingTop', 'paddingBottom', 'paddingRight', 'paddingLeft', 'paddingInline', 'paddingBlock',
  'paddingBlockStart', 'paddingBlockEnd', 'paddingInlineStart', 'paddingInlineEnd',
]
const resetCases: PortedCase[] = reset.map(property => ({
  name: `reset-${property}`,
  email: `:style="{ ${property}: '10px' }"`,
  body: 'Content',
}))

const errors: PortedErrorCase[] = [
  { name: 'lang-empty', lang: '', body: '', cause: 'EEmail lang must be a non-empty string' },
  { name: 'lang-blank', lang: '   ', body: '', cause: 'EEmail lang must be a non-empty string' },
  { name: 'lang-missing', lang: null, body: '', cause: 'EEmail lang must be a non-empty string' },
  { name: 'inner-html', email: 'innerHTML="<script>unsafe()</script>"', body: '', cause: 'EEmail does not support unsafe HTML attribute: innerHTML' },
]

const rendered = renderPortedCases('document', [...cases, ...resetCases])
const renderError = renderPortedErrors('document', errors)

describe('document structure on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('document', entry, rendered)
  })

  // The body keeps margin and padding at 0 for mail clients; the author's value moves to the inner cell.
  it.each(reset)('resets %s on <body> and keeps it on the inner cell', (property) => {
    const css = property.replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
    const { html } = rendered.get(`reset-${property}`)!.email
    expect(html.match(/<body[^>]*>/)![0]).toContain(`${css}:0`)
    expect(html.match(/<td[^>]*>/)![0]).toContain(`${css}:10px`)
  })

  it.each(errors.map(entry => [entry.name, entry] as const))('rejects %s', async (_name, entry) => {
    await renderError(entry)
  })
})
