import { describe, expect, it } from 'vitest'
import type { PortedCase, PortedErrorCase } from './ported'
import { expectPortedCase, renderPortedCases, renderPortedErrors } from './ported'

const mso = (html: string) => html.match(/<!--\[if mso\]>.*?<!\[endif\]-->/g)!.join('')

// The same padding written as an object, a string and an array of objects.
const paddingForms: [string, string][] = [
  ['object', ':style="{ padding: \'12px 20px\' }"'],
  ['string', ':style="\'padding:12px 20px\'"'],
  ['array', ':style="[{ padding: \'12px\' }, { paddingRight: \'20px\', paddingLeft: \'20px\' }]"'],
]

const cases: PortedCase[] = [
  {
    name: 'padding',
    body: '<EButton href="https://example.com" :style="{ padding: \'12px 20px\' }">Activate account</EButton>',
    contains: [
      '<!--[if mso]><i style="mso-font-width:500%;mso-text-raise:18px" hidden>&#8202;&#8202;</i><![endif]-->',
      '<!--[if mso]><i style="mso-font-width:500%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->',
    ],
  },
  {
    name: 'no-padding',
    body: '<EButton href="https://example.com" />',
    contains: [
      '<!--[if mso]><i style="mso-font-width:0%;mso-text-raise:0px" hidden></i><![endif]-->',
      '<!--[if mso]><i style="mso-font-width:0%" hidden>&#8203;</i><![endif]-->',
    ],
  },
  {
    name: 'asymmetric-attributes',
    body: [
      '<EButton aria-label="Activate &amp; continue" class="primary" id="button-test" rel="noreferrer" target="_self"',
      ' href=\'https://example.com/?value="quoted"&amp;mode=test\'',
      ' :style="{ backgroundColor: \'#111\', display: \'block\', lineHeight: \'150%\', maxWidth: \'50%\', padding: \'1px 11px 3px 4px\', textDecoration: \'underline\' }"',
      '>Click &amp; continue</EButton>',
    ].join(''),
    text: 'Click & continue https://example.com/?value="quoted"&mode=test',
    contains: [
      'href="https://example.com/?value=&quot;quoted&quot;&amp;mode=test"',
      'aria-label="Activate &amp; continue"',
      'class="primary"',
      'rel="noreferrer"',
      'target="_self"',
      'style="line-height:150%;text-decoration:underline;display:block;max-width:50%;mso-padding-alt:0px;background-color:#111;padding:1px 11px 3px 4px;padding-top:1px;padding-right:11px;padding-bottom:3px;padding-left:4px;"',
      '<!--[if mso]><i style="mso-font-width:200%;mso-text-raise:3px" hidden>&#8202;</i><![endif]-->',
      '<!--[if mso]><i style="mso-font-width:275%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->',
      '>Click &amp; continue</span>',
    ],
  },
  ...paddingForms.map<PortedCase>(([form, style]) => ({
    name: `padding-${form}`,
    body: `<EButton href="https://example.com" ${style}>Button</EButton>`,
    golden: false,
  })),
]

const errors: PortedErrorCase[] = [
  { name: 'unsafe-attribute', body: '<EButton onclick="unsafe()" />', cause: 'EButton does not support unsafe HTML attribute: onclick' },
  { name: 'infinite-padding', body: '<EButton href="https://example.com" :style="{ padding: Infinity }" />', cause: 'EButton padding must be a finite non-negative value; received Infinity' },
  { name: 'missing-href', body: '<EButton />', cause: 'EButton href must be a non-empty string' },
  { name: 'empty-href', body: '<EButton href="" />', cause: 'EButton href must be a non-empty string' },
  { name: 'unsupported-unit', body: '<EButton href="https://example.com" :style="{ padding: \'10pt\' }" />', cause: 'EButton padding supports only non-negative px, em, rem, and % values; received 10pt' },
]

const rendered = renderPortedCases('button', cases)
const renderError = renderPortedErrors('button', errors)

describe('EButton on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('button', entry, rendered)
  })

  it.each(paddingForms)('writes the same Outlook spacing for a %s style', (form) => {
    expect(mso(rendered.get(`padding-${form}`)!.email.html)).toBe(
      '<!--[if mso]><i style="mso-font-width:500%;mso-text-raise:18px" hidden>&#8202;&#8202;</i><![endif]-->'
      + '<!--[if mso]><i style="mso-font-width:500%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->',
    )
  })

  it.each(errors.map(entry => [entry.name, entry] as const))('rejects %s', async (_name, entry) => {
    await renderError(entry)
  })
})
