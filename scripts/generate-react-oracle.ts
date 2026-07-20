import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { render } from '@react-email/render'
import React from 'react'
import { Body, Head, Html, Text } from 'react-email'

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
  const basicDocument = React.createElement(
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

  return {
    oracle: oracleMetadata,
    cases: {
      'basic-document': await render(basicDocument),
    },
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
