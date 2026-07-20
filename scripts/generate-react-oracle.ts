import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { render, toPlainText } from '@react-email/render'
import React from 'react'
import {
  Body,
  Button,
  CodeBlock,
  CodeInline,
  Column,
  Container,
  dracula,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Markdown,
  oneDark,
  pixelBasedPreset,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from 'react-email'
import { plainTextCorpus } from '../test/conformance/plain-text-corpus'

const ORACLE_PATH = fileURLToPath(new URL('../test/conformance/oracle/react-email-6.9.0.json', import.meta.url))
const REACT_EMAIL_CHECKOUT = process.env.NUXT_EMAIL_REACT_EMAIL_CHECKOUT
  ? resolve(process.env.NUXT_EMAIL_REACT_EMAIL_CHECKOUT)
  : fileURLToPath(new URL('../../react-email', import.meta.url))
const SOURCE_CHECKOUT_COMMIT = '6eb428924c4c2774228a07cbec1977ad8898f143'
const PUBLISHED_PACKAGE_COMMIT = '71656573fa24b09e48173ae2357bf712fcb401b6'

const oracleMetadata = {
  package: 'react-email',
  version: '6.9.0',
  rendererPackage: '@react-email/render',
  rendererVersion: '2.1.0',
  reactVersion: '19.2.7',
  reactDomVersion: '19.2.7',
  sourceCheckoutCommit: SOURCE_CHECKOUT_COMMIT,
  publishedPackageCommit: PUBLISHED_PACKAGE_COMMIT,
} as const

type ComparisonClassification = 'exact' | 'normalized' | 'semantic' | 'intentional-divergence'

interface OracleCaseDefinition {
  reactReference: string
  nuxtComponent: string
  classification: ComparisonClassification
  input: Record<string, unknown>
  semanticAssertions: string[]
  expectedExactFragments?: string[]
  intentionalDivergence?: string
}

async function renderCase(
  definition: OracleCaseDefinition,
  node: React.ReactNode,
  includeText = false,
) {
  return {
    ...definition,
    html: await render(node),
    ...(includeText ? { text: await render(node, { plainText: true }) } : {}),
  }
}

async function renderTextCase(definition: OracleCaseDefinition, node: React.ReactNode) {
  return {
    ...definition,
    text: await render(node, { plainText: true }),
  }
}

function convertTextCase(definition: OracleCaseDefinition, html: string) {
  return {
    ...definition,
    text: toPlainText(html),
  }
}

function verifyPinnedSource(): void {
  const checkoutCommit = execFileSync('git', ['-C', REACT_EMAIL_CHECKOUT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  if (checkoutCommit !== SOURCE_CHECKOUT_COMMIT) {
    throw new Error(`Expected React Email checkout ${SOURCE_CHECKOUT_COMMIT}, received ${checkoutCommit}`)
  }

  execFileSync('git', [
    '-C',
    REACT_EMAIL_CHECKOUT,
    'diff',
    '--quiet',
    `${PUBLISHED_PACKAGE_COMMIT}..${SOURCE_CHECKOUT_COMMIT}`,
    '--',
    'packages/react-email/src/components',
    'packages/render/src',
  ])
}

async function generateOracle() {
  const previewValue = 'Inbox preview'
  const previewWhitespace = '\u00A0\u200C\u200B\u200D\u200E\u200F\uFEFF'
  const phaseZeroDocument = React.createElement(
    Html,
    { lang: 'en' },
    React.createElement(Head),
    React.createElement(
      Body,
      null,
      React.createElement(Text, null, 'Hello & <Ada> — Grüß dich'),
      React.createElement('a', { href: 'https://example.com/?value="quoted"&mode=test' }, 'Open'),
    ),
  )

  const completeBasicEmail = React.createElement(
    Html,
    { lang: 'en' },
    React.createElement(
      Head,
      null,
      React.createElement('title', null, 'Internal title'),
      React.createElement('style', null, 'body{color:#111}'),
    ),
    React.createElement(
      Body,
      { style: { backgroundColor: '#f4f4f4', padding: '20px' } },
      React.createElement(Heading, {
        as: 'h2',
        style: { marginLeft: '4px', marginRight: '4px' },
      }, 'Welcome Ada'),
      React.createElement(Text, null, 'Hello & <Ada> — Grüß dich'),
      React.createElement(Link, { href: 'https://example.com/?value="quoted"&mode=test' }, 'Open account'),
      React.createElement(Img, { alt: 'Nuxt logo', height: '32', src: 'https://example.com/logo.png', width: '32' }),
      React.createElement(Hr),
    ),
  )

  const asymmetricButton = React.createElement(Button, {
    'aria-label': 'Activate & continue',
    'className': 'primary',
    'href': 'https://example.com/?value="quoted"&mode=test',
    'id': 'button-test',
    'rel': 'noreferrer',
    'style': {
      backgroundColor: '#111',
      display: 'block',
      lineHeight: '150%',
      maxWidth: '50%',
      padding: '1px 11px 3px 4px',
      textDecoration: 'underline',
    },
    'target': '_self',
  }, 'Click & continue')

  // --- Feature component fixtures (Font, CodeInline, CodeBlock, Markdown, Tailwind) ---

  type TailwindConfig = NonNullable<React.ComponentProps<typeof Tailwind>['config']>

  const fontDocument = (fontProps: React.ComponentProps<typeof Font>) =>
    React.createElement(
      Html,
      null,
      React.createElement(Head, null, React.createElement(Font, fontProps)),
      React.createElement(Body, null, 'Sample body copy in the branded font.'),
    )

  const codeSnippet = 'const greeting = \'hi\';\nfunction wave() {\n  return greeting;\n}'
  const cssSnippet = '.btn {\n  color: red;\n  padding: 4px 8px;\n}'

  const markdownDocument = [
    '# Heading One',
    '',
    'A paragraph with **bold** and *italic* text and a [link](https://example.com).',
    '',
    '- First item',
    '- Second item',
    '- Third item',
    '',
    '> A quoted line of context.',
    '',
    '```js',
    'const total = 1 + 2;',
    '```',
    '',
    '---',
    '',
    '![Logo alt](https://example.com/logo.png)',
  ].join('\n')

  const markdownCustomDocument = [
    '# Styled heading',
    '',
    'Body text with **strong** emphasis.',
  ].join('\n')

  const markdownEscapingDocument = [
    '[quoted "link" text](https://example.com/?q="a"&b=c "A \\"quoted\\" title")',
    '',
    '![alt "with" quotes](https://example.com/i.png "image \\"title\\"")',
  ].join('\n')

  const markdownNestedDocument = [
    '- Item one',
    '  - Nested one',
    '  - Nested two',
    '- Item two',
    '',
    '1. Ordered one',
    '',
    '2. Ordered two (loose)',
  ].join('\n')

  const tailwindEmail = (config: TailwindConfig | undefined, body: React.ReactNode, head?: React.ReactNode) =>
    React.createElement(
      Tailwind,
      {
        ...(config ? { config } : {}),
        children: React.createElement(
          Html,
          null,
          head ?? React.createElement(Head),
          React.createElement(Body, null, body),
        ),
      },
    )

  // mso-* style properties are intentionally outside React.CSSProperties; the port must
  // preserve them through Tailwind style inlining, so assert the shape deliberately.
  const msoPreservedStyle = { msoHide: 'all', color: 'blue' } as unknown as React.CSSProperties

  async function captureRenderError(node: React.ReactNode): Promise<string | null> {
    try {
      await render(node)
      return null
    }
    catch (error) {
      return error instanceof Error ? error.message : String(error)
    }
  }

  const tailwindNonInlinableWithoutHeadError = await captureRenderError(
    React.createElement(Tailwind, null, React.createElement('div', { className: 'md:bg-red-500' })),
  )

  const cases = {
    'basic-document': await renderCase({
      reactReference: 'packages/react-email/src/components and packages/render/src/node/render.tsx',
      nuxtComponent: 'BasicDocument',
      classification: 'normalized',
      input: { fixture: 'phase zero comparison document' },
      semanticAssertions: [
        'document defaults and head metadata',
        'body presentation table',
        'escaped text and URL attributes',
      ],
      expectedExactFragments: [
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
      ],
    }, phaseZeroDocument),
    'complete-basic-email': await renderCase({
      reactReference: 'packages/react-email/src/components and packages/render/src/node/render.tsx',
      nuxtComponent: 'CompleteBasicEmail',
      classification: 'semantic',
      input: { fixture: 'complete basic email' },
      semanticAssertions: [
        'document defaults and head metadata',
        'body presentation table',
        'leaf primitive structure and styles',
        'escaped text and URL attributes',
      ],
      expectedExactFragments: [
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
      ],
    }, completeBasicEmail),
    'complete-basic-email-text': await renderTextCase({
      reactReference: 'packages/render/src/shared/utils/to-plain-text.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'complete basic email HTML' },
      semanticAssertions: ['head and images excluded', 'links and horizontal rules represented'],
    }, completeBasicEmail),
    'plain-text-nested-lists': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/unstable-to-plain-text.spec.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'nested unordered list' },
      semanticAssertions: ['nested list indentation', 'list item separation'],
    }, plainTextCorpus['plain-text-nested-lists']),
    'plain-text-ordered-start': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/unstable-to-plain-text.spec.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'ordered list starting at five' },
      semanticAssertions: ['ordered list numbering', 'start attribute'],
    }, plainTextCorpus['plain-text-ordered-start']),
    'plain-text-blockquote': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/unstable-to-plain-text.spec.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'multiline blockquote' },
      semanticAssertions: ['quote prefix on every line'],
    }, plainTextCorpus['plain-text-blockquote']),
    'plain-text-breaks': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/unstable-to-plain-text.spec.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'additive hard breaks' },
      semanticAssertions: ['single hard break', 'consecutive hard breaks'],
    }, plainTextCorpus['plain-text-breaks']),
    'plain-text-tables': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/to-plain-text.spec.ts and unstable-to-plain-text.spec.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'ordinary, nested, and data table HTML' },
      semanticAssertions: ['ordinary cell flattening', 'nested table separation', 'aligned data table'],
    }, plainTextCorpus['plain-text-tables']),
    'plain-text-preformatted': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/unstable-to-plain-text.spec.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'preformatted whitespace' },
      semanticAssertions: ['spaces and line breaks preserved'],
    }, plainTextCorpus['plain-text-preformatted']),
    'plain-text-links': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/unstable-to-plain-text.spec.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'fragment, mailto, and bare links' },
      semanticAssertions: ['fragment href suppressed', 'mailto scheme stripped', 'bare anchor text'],
    }, plainTextCorpus['plain-text-links']),
    'plain-text-unicode': convertTextCase({
      reactReference: 'packages/render/src/shared/utils/to-plain-text.ts',
      nuxtComponent: 'renderPlainText',
      classification: 'exact',
      input: { fixture: 'Unicode and combining marks' },
      semanticAssertions: ['Unicode preserved without normalization or wrapping'],
    }, plainTextCorpus['plain-text-unicode']),
    'html-defaults': await renderCase({
      reactReference: 'packages/react-email/src/components/html/html.spec.tsx',
      nuxtComponent: 'EHtml',
      classification: 'intentional-divergence',
      input: {},
      semanticAssertions: ['html tag', 'ltr direction', 'English language'],
      intentionalDivergence: 'Vue SSR does not inject React 19\'s implicit empty head into a standalone html element.',
    }, React.createElement(Html)),
    'head-content': await renderCase({
      reactReference: 'packages/react-email/src/components/head/head.spec.tsx',
      nuxtComponent: 'EHead',
      classification: 'normalized',
      input: { child: 'style element' },
      semanticAssertions: ['content type metadata', 'Apple reformatting metadata', 'child order'],
    }, React.createElement(Head, { id: 'head-test' }, React.createElement('style', null, 'body{color:red}'))),
    'body-reset': await renderCase({
      reactReference: 'packages/react-email/src/components/body/body.spec.tsx',
      nuxtComponent: 'EBody',
      classification: 'semantic',
      input: { style: { backgroundColor: 'pink', color: 'navy', marginInlineStart: '12px', padding: '20px' } },
      semanticAssertions: ['presentation table', 'body margin and padding reset', 'full style copied to inner cell'],
      expectedExactFragments: ['margin-inline-start:0', 'padding:0'],
    }, React.createElement(
      Body,
      {
        id: 'body-test',
        style: { backgroundColor: 'pink', color: 'navy', marginInlineStart: '12px', padding: '20px' },
      },
      'Body content',
    )),
    'text-margins': await renderCase({
      reactReference: 'packages/react-email/src/components/text/text.spec.tsx',
      nuxtComponent: 'EText',
      classification: 'normalized',
      input: { style: { color: 'red', margin: '12px', marginTop: '0px' } },
      semanticAssertions: ['paragraph tag', 'default typography', 'ordered margin precedence', 'user style precedence'],
    }, React.createElement(Text, {
      id: 'text-test',
      style: { color: 'red', margin: '12px', marginTop: '0px' },
    }, 'Text content')),
    'heading-style': await renderCase({
      reactReference: 'packages/react-email/src/components/heading/heading.spec.tsx',
      nuxtComponent: 'EHeading',
      classification: 'normalized',
      input: { as: 'h2', style: { color: 'red', marginLeft: '4px', marginRight: '9px', marginTop: '5px' } },
      semanticAssertions: ['selected heading tag', 'ordinary style forwarding'],
    }, React.createElement(Heading, {
      id: 'heading-test',
      as: 'h2',
      style: { color: 'red', marginLeft: '4px', marginRight: '9px', marginTop: '5px' },
    }, 'Heading content')),
    'link-overrides': await renderCase({
      reactReference: 'packages/react-email/src/components/link/link.spec.tsx',
      nuxtComponent: 'ELink',
      classification: 'semantic',
      input: { href: 'quoted and escaped URL', target: '_self', style: { color: 'red' } },
      semanticAssertions: ['anchor tag', 'escaped URL', 'target override', 'user style precedence'],
    }, React.createElement(Link, {
      id: 'link-test',
      href: 'https://example.com/?value="quoted"&mode=test',
      style: { color: 'red' },
      target: '_self',
    }, 'Link & content')),
    'image-overrides': await renderCase({
      reactReference: 'packages/react-email/src/components/img/img.spec.tsx',
      nuxtComponent: 'EImg',
      classification: 'semantic',
      input: { alt: 'Logo & mark', dimensions: [300, 120], style: { border: '1px solid black' } },
      semanticAssertions: ['image attributes', 'default client-safe styles', 'user style precedence'],
    }, React.createElement(Img, {
      id: 'img-test',
      alt: 'Logo & mark',
      height: '120',
      src: 'https://example.com/logo.png?mode=light&size=2',
      style: { border: '1px solid black' },
      width: '300',
    })),
    'horizontal-rule-overrides': await renderCase({
      reactReference: 'packages/react-email/src/components/hr/hr.spec.tsx',
      nuxtComponent: 'EHr',
      classification: 'semantic',
      input: { style: { borderColor: 'black', width: '50%' } },
      semanticAssertions: ['horizontal rule tag', 'default rule styles', 'user style precedence'],
    }, React.createElement(Hr, {
      id: 'hr-test',
      style: { borderColor: 'black', width: '50%' },
    })),
    'preview-short': await renderCase({
      reactReference: 'packages/react-email/src/components/preview/preview.spec.tsx',
      nuxtComponent: 'EPreview',
      classification: 'intentional-divergence',
      input: { text: previewValue },
      semanticAssertions: ['hidden preview text', '200-character filler policy', 'plain-text exclusion'],
      expectedExactFragments: [
        `<div>${previewWhitespace.repeat(200 - previewValue.length)}</div>`,
      ],
      intentionalDivergence: 'React 19 hoists Preview title output into head; Vue authors place title explicitly in EHead. EPreview also keeps hiding styles and data-skip-in-text fixed so user attributes cannot expose filler.',
    }, React.createElement(Preview, null, previewValue)),
    'preview-max-length': await renderCase({
      reactReference: 'packages/react-email/src/components/preview/preview.spec.tsx',
      nuxtComponent: 'EPreview',
      classification: 'intentional-divergence',
      input: { textLength: 200 },
      semanticAssertions: ['text truncated at 200 UTF-16 code units', 'no filler after maximum length'],
      intentionalDivergence: 'EPreview omits React 19 title output and keeps hiding and plain-text exclusion invariant because Vue SSR cannot safely hoist title into head.',
    }, React.createElement(Preview, null, 'x'.repeat(200))),
    'preview-style-override': await renderCase({
      reactReference: 'packages/react-email/src/components/preview/preview.tsx',
      nuxtComponent: 'EPreview',
      classification: 'intentional-divergence',
      input: { style: { color: 'red' }, text: 'Styled preview' },
      semanticAssertions: ['hidden preview remains hidden when user styles are forwarded'],
      intentionalDivergence: 'React replaces all hiding styles when a user style is provided; EPreview retains the hiding defaults as an email-safety invariant.',
    }, React.createElement(Preview, {
      children: 'Styled preview',
      style: { color: 'red' },
    })),
    'preview-unicode-boundary': await renderCase({
      reactReference: 'packages/react-email/src/components/preview/preview.tsx',
      nuxtComponent: 'EPreview',
      classification: 'intentional-divergence',
      input: { text: '199 ASCII code units followed by an emoji' },
      semanticAssertions: ['preview truncation never emits an unpaired surrogate'],
      intentionalDivergence: 'React truncates at 200 UTF-16 code units and can split a surrogate pair; EPreview drops the whole boundary code point and fills the remaining preview position.',
    }, React.createElement(Preview, null, `${'x'.repeat(199)}😀`)),
    'container-padding': await renderCase({
      reactReference: 'packages/react-email/src/components/container/container.tsx',
      nuxtComponent: 'EContainer',
      classification: 'normalized',
      input: { style: { backgroundColor: 'white', maxWidth: '600px', padding: '24px' } },
      semanticAssertions: ['centered presentation table', 'maximum width', 'padding moved to inner cell'],
    }, React.createElement(Container, {
      id: 'container-test',
      style: { backgroundColor: 'white', maxWidth: '600px', padding: '24px' },
    }, 'Container content')),
    'section-padding': await renderCase({
      reactReference: 'packages/react-email/src/components/section/section.tsx',
      nuxtComponent: 'ESection',
      classification: 'normalized',
      input: { style: { backgroundColor: '#f4f4f4', padding: '16px 20px' } },
      semanticAssertions: ['presentation table', 'one wrapper cell', 'padding moved to wrapper cell'],
    }, React.createElement(Section, {
      id: 'section-test',
      style: { backgroundColor: '#f4f4f4', padding: '16px 20px' },
    }, 'Section content')),
    'row-columns': await renderCase({
      reactReference: 'packages/react-email/src/components/row and packages/react-email/src/components/column',
      nuxtComponent: 'ERow and EColumn',
      classification: 'intentional-divergence',
      input: { columns: 2 },
      semanticAssertions: ['presentation table row', 'two direct cells', 'width and style forwarding'],
      intentionalDivergence: 'EColumn omits React Email\'s internal data-id marker because no Vue behavior consumes it.',
    }, React.createElement(
      Row,
      {
        id: 'row-test',
        children: [
          React.createElement(Column, { key: 'left', style: { color: 'red' }, width: '50%' }, 'Left'),
          React.createElement(Column, { key: 'right', width: '50%' }, 'Right'),
        ],
      },
    )),
    'button-padding': await renderCase({
      reactReference: 'packages/react-email/src/components/button/button.spec.tsx',
      nuxtComponent: 'EButton',
      classification: 'normalized',
      input: { href: 'https://example.com', padding: '12px 20px' },
      semanticAssertions: ['anchor defaults', 'expanded padding', 'Outlook text raise and horizontal spacing'],
      expectedExactFragments: [
        '<!--[if mso]><i style="mso-font-width:500%;mso-text-raise:18px" hidden>&#8202;&#8202;</i><![endif]-->',
        '<!--[if mso]><i style="mso-font-width:500%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->',
      ],
    }, React.createElement(Button, {
      href: 'https://example.com',
      style: { padding: '12px 20px' },
    }, 'Activate account')),
    'button-no-padding': await renderCase({
      reactReference: 'packages/react-email/src/components/button/button.spec.tsx',
      nuxtComponent: 'EButton',
      classification: 'normalized',
      input: { href: 'https://example.com' },
      semanticAssertions: ['default target', 'zero-width Outlook fragments', 'no padding longhands'],
      expectedExactFragments: [
        '<!--[if mso]><i style="mso-font-width:0%;mso-text-raise:0px" hidden></i><![endif]-->',
        '<!--[if mso]><i style="mso-font-width:0%" hidden>&#8203;</i><![endif]-->',
      ],
    }, React.createElement(Button, { href: 'https://example.com' })),
    'button-asymmetric': await renderCase({
      reactReference: 'packages/react-email/src/components/button/button.tsx',
      nuxtComponent: 'EButton',
      classification: 'normalized',
      input: { href: 'quoted and escaped URL', padding: '1px 11px 3px 4px', target: '_self' },
      semanticAssertions: ['asymmetric Outlook spacing', 'user style precedence', 'attributes and escaping'],
      expectedExactFragments: [
        '<!--[if mso]><i style="mso-font-width:200%;mso-text-raise:3px" hidden>&#8202;</i><![endif]-->',
        '<!--[if mso]><i style="mso-font-width:275%" hidden>&#8202;&#8202;&#8203;</i><![endif]-->',
      ],
    }, asymmetricButton),
    'button-asymmetric-text': await renderTextCase({
      reactReference: 'packages/render/src/shared/utils/to-plain-text.ts',
      nuxtComponent: 'renderPlainText with EButton',
      classification: 'exact',
      input: { fixture: 'asymmetric button' },
      semanticAssertions: ['button label and escaped destination'],
    }, asymmetricButton),
    'font-defaults': await renderCase({
      reactReference: 'packages/react-email/src/components/font/font.tsx',
      nuxtComponent: 'EFont',
      classification: 'normalized',
      input: { fontFamily: 'Roboto', fallbackFontFamily: 'Verdana' },
      semanticAssertions: ['@font-face defaults', 'mso-font-alt uses first fallback', 'global font-family rule'],
    }, fontDocument({ fontFamily: 'Roboto', fallbackFontFamily: 'Verdana' })),
    'font-webfont': await renderCase({
      reactReference: 'packages/react-email/src/components/font/font.tsx',
      nuxtComponent: 'EFont',
      classification: 'normalized',
      input: { webFont: { url: 'https://example.com/roboto.woff2', format: 'woff2' }, fontWeight: 700, fontStyle: 'italic' },
      semanticAssertions: ['src url and format', 'custom weight and style'],
    }, fontDocument({
      fontFamily: 'Roboto',
      fallbackFontFamily: 'Verdana',
      webFont: { url: 'https://example.com/roboto.woff2', format: 'woff2' },
      fontWeight: 700,
      fontStyle: 'italic',
    })),
    'font-multiple-fallbacks': await renderCase({
      reactReference: 'packages/react-email/src/components/font/font.tsx',
      nuxtComponent: 'EFont',
      classification: 'normalized',
      input: { fallbackFontFamily: ['Georgia', 'serif'] },
      semanticAssertions: ['mso-font-alt uses first array entry', 'fallbacks joined in global rule'],
    }, fontDocument({ fontFamily: 'Roboto', fallbackFontFamily: ['Georgia', 'serif'] })),
    'code-inline-basic': await renderCase({
      reactReference: 'packages/react-email/src/components/code-inline/code-inline.tsx',
      nuxtComponent: 'ECodeInline',
      classification: 'normalized',
      input: { className: 'inline-code', child: 'const x = 1;' },
      semanticAssertions: ['Orange.fr style rule', 'cino code copy', 'cio span copy always present'],
    }, React.createElement(Text, null, React.createElement(CodeInline, { className: 'inline-code' }, 'const x = 1;'))),
    'code-block-basic': await renderCase({
      reactReference: 'packages/react-email/src/components/code-block/code-block.tsx',
      nuxtComponent: 'ECodeBlock',
      classification: 'normalized',
      input: { language: 'javascript', theme: 'dracula', lines: 3 },
      semanticAssertions: ['theme base pre styles', 'per-token span styles', 'nbsp+ZWJ+ZWSP spaces', 'line breaks'],
    }, React.createElement(CodeBlock, { code: codeSnippet, language: 'javascript', theme: dracula })),
    'code-block-line-numbers': await renderCase({
      reactReference: 'packages/react-email/src/components/code-block/code-block.tsx',
      nuxtComponent: 'ECodeBlock',
      classification: 'normalized',
      input: { language: 'javascript', theme: 'dracula', lineNumbers: true, fontFamily: 'monospace' },
      semanticAssertions: ['line-number prefix span', 'custom font family applied'],
    }, React.createElement(CodeBlock, { code: codeSnippet, language: 'javascript', theme: dracula, lineNumbers: true, fontFamily: 'monospace' })),
    'code-block-css-lang': await renderCase({
      reactReference: 'packages/react-email/src/components/code-block/code-block.tsx',
      nuxtComponent: 'ECodeBlock',
      classification: 'normalized',
      input: { language: 'css', theme: 'oneDark' },
      semanticAssertions: ['css grammar tokenization', 'alternate theme token styles'],
    }, React.createElement(CodeBlock, { code: cssSnippet, language: 'css', theme: oneDark })),
    'markdown-document': await renderCase({
      reactReference: 'packages/react-email/src/components/markdown/markdown.tsx',
      nuxtComponent: 'EMarkdown',
      classification: 'normalized',
      input: { fixture: 'full markdown document' },
      semanticAssertions: ['default per-element inline styles', 'container div with data-id', 'links target _blank', 'tables role presentation'],
    }, React.createElement(Markdown, null, markdownDocument)),
    'markdown-custom-styles': await renderCase({
      reactReference: 'packages/react-email/src/components/markdown/markdown.tsx',
      nuxtComponent: 'EMarkdown',
      classification: 'normalized',
      input: { markdownCustomStyles: { h1: { color: 'red' }, bold: { padding: '1px 2px' } }, markdownContainerStyles: { padding: '8px' } },
      semanticAssertions: ['custom styles merged over defaults', 'container style override'],
    }, React.createElement(Markdown, {
      markdownCustomStyles: { h1: { color: 'red' }, bold: { padding: '1px 2px' } },
      markdownContainerStyles: { padding: '8px' },
      children: markdownCustomDocument,
    })),
    'markdown-links-escaping': await renderCase({
      reactReference: 'packages/react-email/src/components/markdown/markdown.tsx',
      nuxtComponent: 'EMarkdown',
      classification: 'normalized',
      input: { fixture: 'link and image with double quotes in href and title' },
      semanticAssertions: ['double quotes escaped in attributes', 'target _blank on link'],
    }, React.createElement(Markdown, null, markdownEscapingDocument)),
    'markdown-nested-lists': await renderCase({
      reactReference: 'packages/react-email/src/components/markdown/markdown.tsx',
      nuxtComponent: 'EMarkdown',
      classification: 'normalized',
      input: { fixture: 'nested and loose lists' },
      semanticAssertions: ['nested list nesting', 'loose list paragraph wrapping'],
    }, React.createElement(Markdown, null, markdownNestedDocument)),
    'tw-basic-inlining': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { className: 'bg-red-500 text-white p-4' },
      semanticAssertions: ['utility classes inlined to style', 'classes removed from element'],
    }, tailwindEmail(undefined, React.createElement('div', { className: 'bg-red-500 text-white p-4' }, 'Content'))),
    'tw-author-style-precedence': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/utils/tailwindcss/clone-element-with-inlined-styles.ts',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { className: 'bg-red-500', style: { backgroundColor: 'blue' } },
      semanticAssertions: ['author style wins over utility'],
    }, tailwindEmail(undefined, React.createElement('div', { className: 'bg-red-500', style: { backgroundColor: 'blue' } }, 'Content'))),
    'tw-component-style-override': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { component: 'Text', className: 'm-0' },
      semanticAssertions: ['utility overrides component default margins'],
    }, tailwindEmail(undefined, React.createElement(Text, { className: 'm-0' }, 'Content'))),
    'tw-section-padding': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { component: 'Section', className: 'p-4' },
      semanticAssertions: ['section wrapper cell padding from utility'],
    }, tailwindEmail(undefined, React.createElement(Section, { className: 'p-4' }, 'Content'))),
    'tw-row-classes': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { component: 'Row', className: 'w-full bg-gray-100' },
      semanticAssertions: ['row table inlined width and background'],
    }, tailwindEmail(undefined, React.createElement(Row, { className: 'w-full bg-gray-100', children: React.createElement(Column, null, 'Cell') }))),
    'tw-column-classes': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { component: 'Column', className: 'p-2 text-center' },
      semanticAssertions: ['column cell padding and alignment'],
    }, tailwindEmail(undefined, React.createElement(Row, null, React.createElement(Column, { className: 'p-2 text-center' }, 'Cell')))),
    'tw-heading-classes': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { component: 'Heading', className: 'text-2xl font-bold' },
      semanticAssertions: ['heading font size and weight inlined'],
    }, tailwindEmail(undefined, React.createElement(Heading, { className: 'text-2xl font-bold' }, 'Title'))),
    'tw-button-classes': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { component: 'Button', className: 'bg-blue-600 px-4 py-2 text-white', href: 'https://example.com' },
      semanticAssertions: ['button anchor inlined utilities', 'Outlook padding fragments preserved'],
    }, tailwindEmail(undefined, React.createElement(Button, { className: 'bg-blue-600 px-4 py-2 text-white', href: 'https://example.com' }, 'Activate'))),
    'tw-media-queries': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/utils/css/downlevel-for-email-clients.ts',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { className: 'md:bg-red-500 sm:text-lg' },
      semanticAssertions: ['non-inlinable rules injected into head style', 'min-width downlevel', 'sanitized class names'],
    }, tailwindEmail(undefined, React.createElement('div', { className: 'md:bg-red-500 sm:text-lg' }, 'Content'))),
    'tw-preserves-head-children': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { headChildren: ['title', 'style'], className: 'md:bg-red-500' },
      semanticAssertions: ['existing head title and style preserved', 'injected style appended'],
    }, tailwindEmail(
      undefined,
      React.createElement('div', { className: 'md:bg-red-500' }, 'Content'),
      React.createElement(
        Head,
        null,
        React.createElement('title', null, 'Preserved title'),
        React.createElement('style', null, 'body{color:#111}'),
      ),
    )),
    'tw-residual-class-sanitization': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/utils/compatibility/sanitize-class-name.ts',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { className: 'hover:bg-red-500 md:w-1/2' },
      semanticAssertions: ['pseudo and fraction classes sanitized', 'residual classes on element'],
    }, tailwindEmail(undefined, React.createElement('div', { className: 'hover:bg-red-500 md:w-1/2' }, 'Content'))),
    'tw-important': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { className: '!text-red-500' },
      semanticAssertions: ['important modifier preserved in inline style'],
    }, tailwindEmail(undefined, React.createElement('div', { className: '!text-red-500' }, 'Content'))),
    'tw-duplicate-classes': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { className: 'p-4 p-4' },
      semanticAssertions: ['duplicate class collapses to single declaration'],
    }, tailwindEmail(undefined, React.createElement('div', { className: 'p-4 p-4' }, 'Content'))),
    'tw-mso-preserved': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/utils/tailwindcss/clone-element-with-inlined-styles.ts',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { className: 'bg-red-500', style: { msoHide: 'all', color: 'blue' } },
      semanticAssertions: ['mso-* author style preserved alongside inlined utility'],
    }, tailwindEmail(undefined, React.createElement('div', { className: 'bg-red-500', style: msoPreservedStyle }, 'Content'))),
    'tw-pixel-preset': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { config: 'presets: [pixelBasedPreset]', className: 'p-4' },
      semanticAssertions: ['pixel-based spacing yields px padding instead of rem'],
    }, tailwindEmail({ presets: [pixelBasedPreset] }, React.createElement('div', { className: 'p-4' }, 'Content'))),
    'tw-custom-theme': await renderCase({
      reactReference: 'packages/react-email/src/components/tailwind/tailwind.tsx',
      nuxtComponent: 'ETailwind',
      classification: 'normalized',
      input: { config: 'theme.extend.colors.brand', className: 'bg-brand' },
      semanticAssertions: ['custom theme color resolves to hex background'],
    }, tailwindEmail({ theme: { extend: { colors: { brand: '#123456' } } } }, React.createElement('div', { className: 'bg-brand' }, 'Content'))),
  }

  return {
    oracle: oracleMetadata,
    cases,
    errors: {
      'tailwind-non-inlinable-without-head': tailwindNonInlinableWithoutHeadError,
    },
    unsupported: [],
  }
}

const mode = process.argv[2]

if (mode !== '--check' && mode !== '--write') {
  throw new Error('Expected --check or --write')
}

verifyPinnedSource()

const generated = `${JSON.stringify(await generateOracle(), null, 2)}\n`

if (mode === '--write') {
  await writeFile(ORACLE_PATH, generated, 'utf8')
}
else {
  const committed = await readFile(ORACLE_PATH, 'utf8')
  if (committed !== generated) {
    throw new Error('Committed React Email oracle is stale. Run pnpm oracle:write and review the diff.')
  }
}
