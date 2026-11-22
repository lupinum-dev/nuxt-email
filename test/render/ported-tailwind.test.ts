import { describe, it } from 'vitest'
import type { PortedCase } from './ported'
import { expectPortedCase, renderPortedCases } from './ported'

const md4Rule = '@media (min-width:768px){.md_p-4{padding:16px!important}}'

const cases: PortedCase[] = [
  {
    name: 'basic-inlining',
    body: '<div class="bg-red-500 text-white p-4">Content</div>',
    contains: ['<div style="background-color:#fb2c36;padding:16px;color:#fff;">Content</div>'],
  },
  {
    // A camelCase author key replaces the kebab-case Tailwind declaration in place.
    name: 'author-style-wins',
    body: '<div class="bg-red-500" :style="{ backgroundColor: \'blue\' }">Content</div>',
    contains: ['<div style="background-color:blue;">Content</div>'],
    golden: false,
  },
  {
    // `m-0` reaches EText as style, and EText splits it over the four sides.
    name: 'text-margin',
    body: '<EText class="m-0">Content</EText>',
    contains: ['style="font-size:14px;line-height:24px;margin:0;margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;"'],
  },
  {
    name: 'section-padding',
    body: '<ESection class="p-4">Content</ESection>',
    contains: ['<td style="padding:16px;">Content</td>'],
  },
  {
    name: 'row-classes',
    body: '<ERow class="w-full bg-gray-100"><EColumn>Cell</EColumn></ERow>',
    contains: ['style="width:100%;background-color:#f3f4f6;"'],
  },
  {
    name: 'row-padding',
    body: '<ERow class="bg-gray-100 p-4"><EColumn>Cell</EColumn></ERow>',
    contains: [
      'style="background-color:#f3f4f6;"',
      '<td style="padding:16px;"><table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation">',
    ],
  },
  ...[
    ['container', '<EContainer class="md:p-4">Content</EContainer>'],
    ['section', '<ESection class="md:p-4">Content</ESection>'],
    ['row', '<ERow class="md:p-4"><EColumn>Cell</EColumn></ERow>'],
  ].map<PortedCase>(([name, body]) => ({
    // Responsive padding cannot be inlined, so the table keeps a class and the head gets the media rule.
    name: `responsive-padding-${name}`,
    body: body!,
    contains: ['class="md_p-4"', md4Rule],
    excludes: ['<td style="padding:16px;'],
    golden: false,
  })),
  {
    name: 'column-classes',
    body: '<ERow><EColumn class="p-2 text-center">Cell</EColumn></ERow>',
    contains: ['<td style="padding:8px;text-align:center;">Cell</td>'],
  },
  {
    name: 'heading-classes',
    body: '<EHeading class="text-2xl font-bold">Title</EHeading>',
    contains: ['<h1 style="font-size:24px;line-height:1.3333333333333333;font-weight:700;">Title</h1>'],
  },
  {
    // px-4 is 16px of padding, which sets the Outlook spacer width.
    name: 'button-classes',
    body: '<EButton class="bg-blue-600 px-4 py-2 text-white" href="https://example.com">Activate</EButton>',
    contains: [
      '<!--[if mso]><i style="mso-font-width:400%;mso-text-raise:12px" hidden>&#8202;&#8202;</i><![endif]-->',
      '<!--[if mso]><i style="mso-font-width:400%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->',
    ],
  },
  {
    name: 'media-queries',
    body: '<div class="md:bg-red-500 sm:text-lg">Content</div>',
    contains: [
      '<style>@media (min-width:640px){.sm_text-lg{font-size:18px!important;line-height:1.5555555555555556!important}}@media (min-width:768px){.md_bg-red-500{background-color:#fb2c36!important}}</style>',
      '<div class="md_bg-red-500 sm_text-lg">Content</div>',
    ],
  },
  {
    // The class on the element and the selector in the head must use the same sanitized name.
    name: 'residual-classes',
    body: '<div class="hover:bg-red-500 md:w-1/2">Content</div>',
    contains: [
      '<div class="hover_bg-red-500 md_w-1_2">Content</div>',
      '@media (hover:hover){.hover_bg-red-500:hover{background-color:#fb2c36!important}}',
    ],
    excludes: ['&'],
  },
  {
    name: 'important',
    body: '<div class="!text-red-500">Content</div>',
    contains: ['<div style="color:#fb2c36!important;">Content</div>'],
  },
  {
    name: 'duplicate-classes',
    body: '<div class="p-4 p-4">Content</div>',
    contains: ['<div style="padding:16px;">Content</div>'],
  },
  {
    name: 'mso-author-style',
    body: '<div class="bg-red-500" :style="{ msoHide: \'all\', color: \'blue\' }">Content</div>',
    contains: ['<div style="background-color:#fb2c36;mso-hide:all;color:blue;">Content</div>'],
  },
  {
    // Classes inside an imported component resolve like classes in the template, including a head-only rule.
    name: 'nested-component',
    script: 'import Nested from \'./components/Nested.vue\'',
    body: '<Nested />',
    contains: [
      '<div class="md_text-lg" style="background-color:#fb2c36;padding:16px;">',
      'margin:0;margin-top:0;margin-bottom:0;margin-left:0;margin-right:0;',
      '<!--[if mso]><i style="mso-font-width:400%;mso-text-raise:12px" hidden>&#8202;&#8202;</i><![endif]-->',
      '<style>@media (min-width:768px){.md_text-lg{font-size:18px!important;line-height:1.5555555555555556!important}}</style>',
    ],
  },
]

// The generated <style> goes before the first author <style> in <head>, as with the runtime engine, so
// author CSS keeps the last word.
const headChildren: PortedCase = {
  name: 'head-children',
  head: '<title>Preserved title</title><component is="style">body{color:#111}</component>',
  body: '<div class="md:bg-red-500">Content</div>',
  contains: ['<title>Preserved title</title><style>@media (min-width:768px){.md_bg-red-500{background-color:#fb2c36!important}}</style><style>body{color:#111}</style>'],
  golden: false,
}

const nested = [
  '<template>',
  '  <div class="bg-red-500 p-4 md:text-lg">',
  '    <EText class="m-0">Nested text</EText>',
  '    <EButton class="bg-blue-600 px-4 py-2" href="https://example.com">Nested button</EButton>',
  '  </div>',
  '</template>',
  '',
].join('\n')

const rendered = renderPortedCases('tailwind', [...cases, headChildren], { 'components/Nested.vue': nested })

describe('Tailwind classes on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('tailwind', entry, rendered)
  })

  it('puts the generated head rules before the author head styles', async () => {
    await expectPortedCase('tailwind', headChildren, rendered)
  })
})
