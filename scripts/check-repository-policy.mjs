#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const readme = readFileSync(resolve(root, 'README.md'), 'utf8')
const trackedFiles = new Set(execFileSync('git', ['ls-files'], {
  cwd: root,
  encoding: 'utf8',
}).trim().split('\n'))

for (const path of [
  '.github/ISSUE_TEMPLATE/bug.md',
  '.github/ISSUE_TEMPLATE/config.yml',
  '.github/ISSUE_TEMPLATE/documentation.md',
  '.github/ISSUE_TEMPLATE/proposal.md',
  '.github/pull_request_template.md',
]) {
  if (!trackedFiles.has(path)) throw new Error(`${path} must be tracked.`)
}

const pullRequestTemplate = readFileSync(resolve(root, '.github/pull_request_template.md'), 'utf8')
for (const marker of [
  '- [ ] I ran `pnpm verify`, or I explained why it does not apply.',
  '- [ ] I updated versions, migration guidance, and compatibility notes when the public contract changed.',
]) {
  if (!pullRequestTemplate.includes(marker)) throw new Error(`Pull request template is missing: ${marker}`)
}

const docsAppConfig = readFileSync(resolve(root, 'docs/app/app.config.ts'), 'utf8')
for (const marker of [
  "plausible: { scriptId: 'vkwO2ZsNQtpycIOZdf5cy' }",
  'feedback: { enabled: true }',
  'https://discord.gg/RPH6SeA36N',
  'https://lupinum.com/impressum',
  'https://lupinum.com/datenschutz',
]) {
  if (!docsAppConfig.includes(marker)) throw new Error(`Documentation app config is missing: ${marker}`)
}

function requireMatch(pattern, message) {
  if (!pattern.test(readme)) throw new Error(message)
}

requireMatch(/<img[^>]+width="128"[^>]+alt="Nuxt Email icon"/u, 'README must start with the 128 px product icon.')
requireMatch(/<h1 align="center">Nuxt Email<\/h1>/u, 'README must use the centered product heading.')
requireMatch(/img\.shields\.io\/npm\/v\/@lupinum\/nuxt-email/u, 'README must show the npm badge.')
requireMatch(/actions\/workflows\/ci\.yml\/badge\.svg/u, 'README must show the CI badge.')
requireMatch(/license-MIT/u, 'README must show the MIT badge.')
requireMatch(/https:\/\/nuxt-email\.lupinum\.com/u, 'README must link to the canonical documentation site.')
requireMatch(/https:\/\/github\.com\/lupinum-dev\/nuxt-email/u, 'README must link to the canonical repository.')

const h1Count =
  (readme.match(/^# /gmu)?.length ?? 0) + (readme.match(/<h1\b/gu)?.length ?? 0)
if (h1Count !== 1) throw new Error(`README must contain one H1, found ${h1Count}.`)

const sections = [
  'Why use Nuxt Email?',
  'When to use it',
  'Requirements',
  'Installation',
  'Quick start',
  'Email components',
  'Development preview',
  'Testing',
  'Compatibility evidence',
  'Package exports',
  'Documentation',
  'Contributing and development',
  'Support and security',
  'License',
]
const positions = sections.map((section) => readme.indexOf(`## ${section}`))
if (positions.some((position) => position === -1)) {
  throw new Error('README is missing a required public section.')
}
if (positions.some((position, index) => index > 0 && position < positions[index - 1])) {
  throw new Error('README public sections are out of order.')
}

for (const match of readme.matchAll(/^## (.+)$/gmu)) {
  const heading = match[1].trim()
  const unexpected = heading
    .split(/\s+/u)
    .slice(1)
    .filter(
      (word) =>
        /^[A-Z][A-Za-z-]*$/u.test(word) &&
        !['Email', 'Nuxt'].includes(word),
    )
  if (unexpected.length > 0) {
    throw new Error(`README heading is not sentence case: ${heading}`)
  }
}

if (/\b(?:TODO|TBD|PLACEHOLDER)\b/iu.test(readme)) {
  throw new Error('README contains placeholder text.')
}

const maintaining = readFileSync(resolve(root, 'MAINTAINING.md'), 'utf8')
for (const heading of [
  'Quick fixes',
  'Large changes',
  'Documentation changes',
  'Review dependencies',
  'Prepare a release',
  'Recover a release',
  'Respond to a credential incident',
]) {
  if (!maintaining.includes(`## ${heading}`)) {
    throw new Error(`MAINTAINING.md is missing the playbook: ${heading}`)
  }
}

const vercel = JSON.parse(readFileSync(resolve(root, 'docs/vercel.json'), 'utf8'))
if (existsSync(resolve(root, 'vercel.json'))) {
  throw new Error('Keep vercel.json in the deployable docs app.')
}
if (vercel.framework !== 'nuxtjs') throw new Error('Vercel must select the Nuxt framework.')
if (vercel.outputDirectory !== null) {
  throw new Error('Vercel must let Nuxt provide .vercel/output.')
}
if (vercel.buildCommand !== 'pnpm --dir .. docs:build') {
  throw new Error('Vercel must build the package before the docs app.')
}
if ('installCommand' in vercel) {
  throw new Error('Vercel must detect pnpm from the repository lockfile.')
}

process.stdout.write('Repository policy check passed.\n')
