#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '..')
const readme = readFileSync(resolve(root, 'README.md'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const ciWorkflow = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')
const ciConfig = parse(ciWorkflow)
const moduleSource = readFileSync(resolve(root, 'src/module.ts'), 'utf8')
const workspacePolicy = readFileSync(resolve(root, 'pnpm-workspace.yaml'), 'utf8')
const renovate = JSON.parse(readFileSync(resolve(root, 'renovate.json'), 'utf8'))
const trackedFiles = new Set(execFileSync('git', ['ls-files'], {
  cwd: root,
  encoding: 'utf8',
}).trim().split('\n'))
if (!ciWorkflow.includes('node scripts/verify-action-shas.mjs')) {
  throw new Error('CI must verify pinned Action commits upstream.')
}
if (ciWorkflow.includes('GITHUB_TOKEN')) {
  throw new Error('Action verification must not receive GITHUB_TOKEN.')
}
const classifyScript = ciConfig.jobs.classify.steps.find(
  step => step.name === 'Select required lanes',
)?.with?.script
if (
  typeof classifyScript !== 'string'
  || !classifyScript.includes(`context.eventName !== 'pull_request'`)
  || !classifyScript.includes(`core.setOutput('full'`)
  || !classifyScript.includes(`core.setOutput('docs'`)
) {
  throw new Error('CI must classify expensive pull-request lanes and run all lanes on main.')
}
const gate = ciConfig.jobs.gate
if (gate.if !== 'always()' || gate.name !== 'CI gate') {
  throw new Error('CI must expose one always-reported aggregate gate.')
}
if (!gate.needs.includes('classify') || !gate.needs.includes('test') || !gate.needs.includes('docs-site')) {
  throw new Error('The CI gate must depend on every classified lane.')
}
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
for (const scenario of [
  { name: 'public docs', event: 'pull_request', paths: ['docs/content/1.index.md'], full: 'false', docs: 'true' },
  { name: 'module source', event: 'pull_request', paths: ['src/module.ts'], full: 'true', docs: 'true' },
  { name: 'test only', event: 'pull_request', paths: ['test/unit/render.test.ts'], full: 'true', docs: 'false' },
  { name: 'workflow policy', event: 'pull_request', paths: ['.github/workflows/ci.yml'], full: 'true', docs: 'true' },
  { name: 'main certification', event: 'push', paths: [], full: 'true', docs: 'true' },
]) {
  const outputs = new Map()
  await new AsyncFunction('context', 'github', 'core', classifyScript)(
    { eventName: scenario.event, issue: { number: 1 }, repo: { owner: 'lupinum-dev', repo: 'nuxt-email' } },
    {
      paginate: async () => scenario.paths.map(filename => ({ filename })),
      rest: { pulls: { listFiles() {} } },
    },
    { setOutput: (name, value) => outputs.set(name, value) },
  )
  if (outputs.get('full') !== scenario.full || outputs.get('docs') !== scenario.docs) {
    throw new Error(`CI classification failed the ${scenario.name} fixture.`)
  }
}
if (renovate.minimumReleaseAge !== '1 day') {
  throw new Error('Renovate must match the 24-hour pnpm quarantine.')
}

for (const policy of [
  'minimumReleaseAge: 1440',
  'minimumReleaseAgeStrict: true',
  'minimumReleaseAgeIgnoreMissingTime: false',
]) {
  if (!workspacePolicy.includes(policy)) throw new Error(`pnpm-workspace.yaml is missing: ${policy}`)
}

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
  'plausible: { scriptId: \'vkwO2ZsNQtpycIOZdf5cy\' }',
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
requireMatch(
  /<h1 align="center">[\s\S]*?<img[^>]+alt="Nuxt Email">[\s\S]*?<\/h1>/u,
  'README must use the centered product wordmark as its heading.',
)
requireMatch(/img\.shields\.io\/npm\/v\/@lupinum\/nuxt-email/u, 'README must show the npm badge.')
requireMatch(/actions\/workflows\/ci\.yml\/badge\.svg/u, 'README must show the CI badge.')
requireMatch(/license-MIT/u, 'README must show the MIT badge.')
requireMatch(/https:\/\/deepwiki\.com\/lupinum-dev\/nuxt-email/u, 'README must link to DeepWiki.')
requireMatch(/https:\/\/nuxt-email\.lupinum\.com/u, 'README must link to the canonical documentation site.')
requireMatch(/https:\/\/github\.com\/lupinum-dev\/nuxt-email/u, 'README must link to the canonical repository.')

const h1Count
  = (readme.match(/^# /gmu)?.length ?? 0) + (readme.match(/<h1\b/gu)?.length ?? 0)
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
const positions = sections.map(section => readme.indexOf(`## ${section}`))
if (positions.includes(-1)) {
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
      word =>
        /^[A-Z][A-Za-z-]*$/u.test(word)
        && !['Email', 'Nuxt'].includes(word),
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
const vercelPreviewWorkflow = readFileSync(resolve(root, '.github/workflows/vercel-preview.yml'), 'utf8')
const expectedVercelIgnoreCommand = 'node scripts/vercel-ignore.mjs'
if (existsSync(resolve(root, 'vercel.json'))) {
  throw new Error('Keep vercel.json in the deployable docs app.')
}
if (vercel.framework !== 'nuxtjs') throw new Error('Vercel must select the Nuxt framework.')
if (!vercelPreviewWorkflow.includes('/v13/deployments')) {
  throw new Error('Create previews through the Vercel deployment API.')
}
if (
  !vercelPreviewWorkflow.includes('checks: write')
  || !vercelPreviewWorkflow.includes('cancel-in-progress: false')
) {
  throw new Error('Report exact-commit preview status without canceling requested builds.')
}
if (!['getCollaboratorPermissionLevel', 'AbortSignal.timeout', 'ignored-build-step'].every(boundary => vercelPreviewWorkflow.includes(boundary))) {
  throw new Error('Keep preview authorization, API resilience, and neutral skip handling.')
}
if (/actions\/checkout@|vercel build|vercel deploy|pnpm install|^\s*(?:-\s*)?run:/mu.test(vercelPreviewWorkflow)) {
  throw new Error('The token-holding preview workflow must not execute pull-request code.')
}
if (
  vercel.git?.deploymentEnabled?.['**'] !== false
  || vercel.git.deploymentEnabled.main !== true
  || Object.keys(vercel.git.deploymentEnabled).length !== 2
) {
  throw new Error('Vercel must deploy main automatically and require /vercel for pull-request previews.')
}
if (vercel.ignoreCommand !== expectedVercelIgnoreCommand) {
  throw new Error('Vercel must skip deployments that cannot affect the documentation app.')
}
const runVercelIgnoreCommand = previousSha => spawnSync('sh', ['-c', vercel.ignoreCommand], {
  cwd: resolve(root, 'docs'),
  env: { ...process.env, VERCEL_GIT_PREVIOUS_SHA: previousSha },
})
if (runVercelIgnoreCommand('0000000000000000000000000000000000000000').status !== 1) {
  throw new Error('Vercel must build when a rebased or force-pushed previous commit is unavailable.')
}
if (runVercelIgnoreCommand('HEAD').status !== 0) {
  throw new Error('Vercel must skip the build when documentation inputs are unchanged.')
}
if (vercel.outputDirectory !== null) {
  throw new Error('Vercel must let Nuxt provide .vercel/output.')
}
if (vercel.buildCommand !== 'pnpm --dir .. docs:build') {
  throw new Error('Vercel must build the package before the docs app.')
}
if (packageJson.scripts?.['docs:build'] !== 'pnpm docs:theme && nuxt-module-build prepare && pnpm prepack && pnpm --dir docs build') {
  throw new Error('docs:build must verify the theme and prepare the Nuxt module before the cold package build.')
}
if (!ciWorkflow.includes('run: pnpm docs:build')) {
  throw new Error('CI must use the root docs:build contract.')
}
if (packageJson.dependencies?.['unplugin-vue'] !== '7.2.0') {
  throw new Error('The package must pin the Rollup-compatible Vue SFC compiler.')
}
if (packageJson.dependencies?.['@vitejs/plugin-vue']) {
  throw new Error('@vitejs/plugin-vue must not ship as the Nitro Rollup compiler.')
}
if (!moduleSource.includes('from \'unplugin-vue/rollup\'')) {
  throw new Error('Nitro must compile email SFCs with the Rollup adapter.')
}
if ('installCommand' in vercel) {
  throw new Error('Vercel must detect pnpm from the repository lockfile.')
}

await import('./test-publish-workflow.mjs')

process.stdout.write('Repository policy check passed.\n')
