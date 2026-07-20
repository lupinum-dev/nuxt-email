import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { render } from '@react-email/render'
import React from 'react'
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from 'react-email'

const ORACLE_PATH = fileURLToPath(new URL('../test/conformance/oracle/react-email-6.9.0.json', import.meta.url))
const REACT_EMAIL_CHECKOUT = fileURLToPath(new URL('../../react-email', import.meta.url))
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
      React.createElement(Heading, { as: 'h2', mx: 4 }, 'Welcome Ada'),
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
    'heading-spacing': await renderCase({
      reactReference: 'packages/react-email/src/components/heading/heading.spec.tsx',
      nuxtComponent: 'EHeading',
      classification: 'normalized',
      input: { as: 'h2', mx: 4, mt: '5', style: { color: 'red', marginRight: '9px' } },
      semanticAssertions: ['selected heading tag', 'spacing conversion', 'user style precedence'],
    }, React.createElement(Heading, {
      id: 'heading-test',
      as: 'h2',
      mx: 4,
      mt: '5',
      style: { color: 'red', marginRight: '9px' },
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
  }

  return {
    oracle: oracleMetadata,
    cases,
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
