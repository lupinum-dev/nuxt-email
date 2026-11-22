import { describe, expect, it } from 'vitest'
import type { PortedCase, PortedErrorCase } from './ported'
import { expectPortedCase, renderPortedCases, renderPortedErrors } from './ported'

const quotedHref = 'href=\'https://example.com/?value="quoted"&amp;mode=test\''
const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']

const cases: PortedCase[] = [
  {
    name: 'text-empty',
    body: '<EText />',
    contains: ['<p style="font-size:14px;line-height:24px;margin-top:16px;margin-bottom:16px;"></p>'],
  },
  {
    // `margin` is spread over the four sides first; margin-top then wins in place.
    name: 'text-margins',
    body: '<EText id="text-test" :style="{ color: \'red\', margin: \'12px\', marginTop: \'0px\' }">Text content</EText>',
    contains: ['<p id="text-test" style="font-size:14px;line-height:24px;color:red;margin:12px;margin-top:0px;margin-bottom:12px;margin-left:12px;margin-right:12px;">Text content</p>'],
  },
  {
    name: 'text-static-style',
    body: '<EText style="color: red; margin: 12px; margin-top: 0px">Static style</EText>',
    contains: ['style="font-size:14px;line-height:24px;color:red;margin:12px;margin-top:0px;margin-bottom:12px;margin-left:12px;margin-right:12px;"'],
    golden: false,
  },
  ...headings.map<PortedCase>(tag => ({
    name: `heading-${tag}`,
    body: `<EHeading as="${tag}" :style="{ marginLeft: '4px', marginRight: '4px' }">${tag}</EHeading>`,
    contains: [`<${tag} style="margin-left:4px;margin-right:4px;">${tag}</${tag}>`],
    excludes: [' as='],
    golden: false,
  })),
  { name: 'heading-default', body: '<EHeading />', contains: ['<h1></h1>'], golden: false },
  {
    name: 'heading-style',
    body: '<EHeading id="heading-test" as="h2" :style="{ color: \'red\', marginLeft: \'4px\', marginRight: \'9px\', marginTop: \'5px\' }">Heading content</EHeading>',
    contains: ['<h2 id="heading-test" style="color:red;margin-left:4px;margin-right:9px;margin-top:5px;">Heading content</h2>'],
  },
  {
    name: 'link-defaults',
    body: '<ELink href="https://example.com">Example</ELink>',
    contains: ['<a href="https://example.com" target="_blank">Example</a>'],
    excludes: ['style='],
  },
  {
    name: 'link-overrides',
    body: `<ELink aria-label="Open &amp; inspect" id="link-test" ${quotedHref} rel="noreferrer" :style="{ color: 'red' }" target="_self">Link &amp; content</ELink>`,
    contains: [
      'href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"',
      'aria-label="Open &amp; inspect"',
      'id="link-test"',
      'rel="noreferrer"',
      'style="color:red;"',
      'target="_self"',
      '>Link &amp; content</a>',
    ],
  },
  {
    name: 'img-attributes',
    body: '<EImg id="img-test" alt="Logo &amp; mark" height="120" src="https://example.com/logo.png?mode=light&amp;size=2" :style="{ border: \'1px solid black\' }" width="300" />',
    contains: [
      'alt="Logo &amp; mark"',
      'src="https://example.com/logo.png?mode=light&amp;size=2"',
      'height="120"',
      'width="300"',
      'id="img-test"',
      'style="display:block;outline:none;border:1px solid black;text-decoration:none;"',
    ],
  },
  {
    // An empty alt marks the image as decorative; it must stay in the output.
    name: 'img-decorative',
    body: '<EImg alt="" src="logo.png" />',
    contains: ['<img alt src="logo.png" style="display:block;'],
  },
  {
    name: 'hr-defaults',
    body: '<EHr />',
    contains: ['style="width:100%;border:none;border-color:transparent;border-top:1px solid #eaeaea;"'],
  },
  {
    name: 'hr-overrides',
    body: '<EHr id="hr-test" :style="{ borderColor: \'black\', width: \'50%\' }" />',
    contains: ['<hr id="hr-test" style="width:50%;border:none;border-color:black;border-top:1px solid #eaeaea;">'],
  },
  {
    // Vue applies a prop default for undefined only; null still renders an h1.
    name: 'heading-null-as',
    body: '<EHeading :as="null">Title</EHeading>',
    contains: ['<h1>Title</h1>'],
    golden: false,
  },
  {
    name: 'safe-urls',
    script: `const hrefs = ['mailto:a@example.com', 'tel:+431234', 'cid:logo', '/account', '#top', '{{unsubscribe}}', '%unsubscribe_url%', 'https://example.com']`,
    body: '<ELink v-for="href in hrefs" :key="href" :href="href">x</ELink><EButton href="{{unsubscribe}}">x</EButton><EImg alt="" src="data:image/png;base64,iVBORw0KGgo=" /><EImg alt="" src="cid:logo" />',
    contains: ['href="mailto:a@example.com"', 'href="tel:+431234"', 'href="cid:logo"', 'href="/account"', 'href="#top"', 'href="{{unsubscribe}}"', 'href="%unsubscribe_url%"', 'src="data:image/png;base64,iVBORw0KGgo="', 'src="cid:logo"'],
    golden: false,
  },
]

// Each value is a JS string literal; the scheme test ignores case, whitespace and control characters.
const unsafeUrls: [component: string, attribute: string, value: string, scheme: string][] = [
  ['ELink', 'href', `'javascript:alert(1)'`, 'javascript'],
  ['ELink', 'href', `' JavaScript:alert(1)'`, 'javascript'],
  ['ELink', 'href', `'java\\tscr\\nipt:alert(1)'`, 'javascript'],
  ['ELink', 'href', `'java\\u0000script:alert(1)'`, 'javascript'],
  ['ELink', 'href', `'VBScript:msgbox(1)'`, 'vbscript'],
  ['ELink', 'href', `'data:text/html,x'`, 'data'],
  ['EButton', 'href', `'javascript:alert(1)'`, 'javascript'],
  ['EButton', 'href', `'data:text/html,x'`, 'data'],
  ['EImg', 'src', `'javascript:alert(1)'`, 'javascript'],
  ['EImg', 'src', `'vbscript:msgbox(1)'`, 'vbscript'],
]

const errors: PortedErrorCase[] = [
  { name: 'heading-unsafe-tag', body: '<EHeading as="script">unsafe()</EHeading>', cause: 'EHeading as must be one of h1, h2, h3, h4, h5, h6; received script' },
  { name: 'link-missing-href', body: '<ELink>Link</ELink>', cause: 'ELink href must be a non-empty string' },
  { name: 'link-empty-href', body: '<ELink href="">Link</ELink>', cause: 'ELink href must be a non-empty string' },
  { name: 'img-missing-alt', body: '<EImg src="logo.png" />', cause: 'EImg alt must be a string; use an empty string for decorative images' },
  { name: 'img-missing-src', body: '<EImg alt="Logo" />', cause: 'EImg src must be a non-empty string' },
  { name: 'img-empty-src', body: '<EImg alt="Logo" src="" />', cause: 'EImg src must be a non-empty string' },
  ...unsafeUrls.map<PortedErrorCase>(([component, attribute, value, scheme], index) => ({
    name: `unsafe-url-${index}`,
    script: `const url = ${value}`,
    body: `<${component} alt="" :${attribute}="url">x</${component}>`,
    cause: `${component} ${attribute} uses an unsafe URL scheme: ${scheme}`,
  })),
]

const rendered = renderPortedCases('content', cases)
const renderError = renderPortedErrors('content', errors)

describe('text, heading, link, image and rule on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('content', entry, rendered)
  })

  it.each(errors.map(entry => [entry.name, entry] as const))('rejects %s', async (_name, entry) => {
    await renderError(entry)
  })

  it('keeps the link default colour out of the output (the style is only the author style)', () => {
    expect(rendered.get('link-overrides')!.email.html).not.toContain('#067df7')
  })
})
