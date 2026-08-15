import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const workflow = readFileSync(new URL('../.github/workflows/publish.yml', import.meta.url), 'utf8')
const publishJob = /^ {2}publish:\n([\s\S]*?)(?=^ {2}[a-z][a-z-]*:\n)/m.exec(workflow)?.[1]
assert(publishJob, 'publish.yml is missing the isolated publish job.')
assert(publishJob.includes('environment: npm'), 'The publish job must use the npm environment.')
assert(publishJob.includes('id-token: write'), 'The publish job must use trusted publishing.')
for (const forbidden of ['actions/checkout@', 'npm install', 'pnpm install', 'node scripts/']) {
  assert(!publishJob.includes(forbidden), `The publish job must not contain ${forbidden}.`)
}

const releaseJob = /^ {2}github-release:\n([\s\S]*)$/m.exec(workflow)?.[1]
assert(releaseJob, 'publish.yml is missing GitHub release creation.')
assert(
  releaseJob.includes('This first npm version was created from the exact CI-certified artifact'),
  'Bootstrap releases must record the missing first-version provenance.',
)

const publishLines = publishJob.split('\n')
const publishStart = publishLines.findIndex(line => line.includes('node --input-type=module <<\'NODE\''))
const publishEnd = publishLines.findIndex(
  (line, index) => index > publishStart && line.trim() === 'NODE',
)
assert(publishStart >= 0 && publishEnd > publishStart, 'The publish job must contain one inline Node program.')
const publishScript = dedent(publishLines.slice(publishStart + 1, publishEnd).join('\n')).replace(
  'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000)',
  'Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 0)',
)

runScenario('matching bootstrap bytes', {
  allowBootstrap: true,
  existing: true,
  expectedBootstrap: true,
  expectedPublishes: 0,
})
runScenario('missing package uses OIDC', {
  expectedBootstrap: false,
  expectedPublishes: 1,
})
runScenario('different bytes fail', {
  existing: true,
  differentBytes: true,
  expectedError: 'exists with different bytes',
})
runScenario('wrong dist-tag fails', {
  existing: true,
  attested: true,
  wrongTag: true,
  expectedError: 'did not expose the required bytes',
})
runScenario('later provenance-free version fails', {
  allowBootstrap: true,
  existing: true,
  extraVersion: true,
  expectedError: 'is not the first package version and has no provenance',
})
runScenario('a bootstrap package must remain the sole version', {
  allowBootstrap: true,
  existing: true,
  laterVersionDuringVerification: true,
  expectedError: 'did not expose the required bytes',
})
runScenario('bootstrap recovery requires explicit authorization', {
  existing: true,
  expectedError: 'requires explicit bootstrap authorization',
})
runScenario('new provenance-free publication fails', {
  publishProvenance: false,
  expectedError: 'did not expose the required bytes',
})

process.stdout.write('Publish recovery policy verified.\n')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function dedent(value) {
  const lines = value.split('\n')
  const indentation = Math.min(
    ...lines.filter(Boolean).map(line => line.match(/^\s*/)[0].length),
  )
  return lines.map(line => line.slice(indentation)).join('\n')
}

function runScenario(name, options) {
  const root = mkdtempSync(join(tmpdir(), 'nuxt-email-release-policy-'))
  try {
    const releaseDir = join(root, '.release')
    const binDir = join(root, 'bin')
    mkdirSync(releaseDir)
    mkdirSync(binDir)
    const packageName = '@lupinum/nuxt-email'
    const packageVersion = '0.1.0'
    const channel = 'latest'
    const tarball = 'lupinum-nuxt-email.tgz'
    const bytes = Buffer.from(`${packageName}@${packageVersion}`)
    const sha1 = createHash('sha1').update(bytes).digest('hex')
    writeFileSync(join(releaseDir, tarball), bytes)
    writeFileSync(
      join(releaseDir, 'release-artifact.json'),
      JSON.stringify({ packageName, packageVersion, channel, tarball, sha1 }),
    )

    const statePath = join(root, 'registry.json')
    writeFileSync(
      statePath,
      JSON.stringify({
        packageName,
        packageVersion,
        channel,
        tarball: join(releaseDir, tarball),
        sha1,
        existing: options.existing === true,
        registrySha1: options.differentBytes ? '0'.repeat(40) : sha1,
        attestations: options.attested ? { url: 'https://registry.example/provenance' } : null,
        versions: options.extraVersion ? [packageVersion, '0.1.1'] : [packageVersion],
        versionViews: 0,
        addLaterVersion: options.laterVersionDuringVerification === true,
        tag: options.wrongTag ? '0.0.1' : packageVersion,
        publishProvenance: options.publishProvenance !== false,
        publishes: 0,
      }),
    )
    const npmPath = join(binDir, 'npm')
    writeFileSync(npmPath, fakeNpmProgram())
    chmodSync(npmPath, 0o755)
    const runnerPath = join(root, 'publish.mjs')
    writeFileSync(runnerPath, publishScript)
    const outputPath = join(root, 'output.txt')
    const result = spawnSync(process.execPath, [runnerPath], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        ALLOW_BOOTSTRAP: options.allowBootstrap ? 'true' : 'false',
        PATH: `${binDir}:${process.env.PATH}`,
        FAKE_NPM_STATE: statePath,
        GITHUB_OUTPUT: outputPath,
        GITHUB_STEP_SUMMARY: join(root, 'summary.md'),
        RELEASE_VERSION: packageVersion,
      },
    })
    const diagnostic = `${result.stdout}\n${result.stderr}`
    if (options.expectedError) {
      assert(result.status !== 0, `${name} unexpectedly succeeded.`)
      assert(diagnostic.includes(options.expectedError), `${name} failed for the wrong reason: ${diagnostic}`)
      return
    }
    assert(result.status === 0, `${name} failed: ${diagnostic}`)
    assert(
      readFileSync(outputPath, 'utf8').includes(
        `bootstrap=${String(options.expectedBootstrap)}`,
      ),
      `${name} reported the wrong mode.`,
    )
    const state = JSON.parse(readFileSync(statePath, 'utf8'))
    assert(state.publishes === options.expectedPublishes, `${name} published the wrong count.`)
  }
  finally {
    rmSync(root, { recursive: true, force: true })
  }
}

function fakeNpmProgram() {
  return `#!/usr/bin/env node
const fs = require('node:fs')
const crypto = require('node:crypto')
const statePath = process.env.FAKE_NPM_STATE
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'))
const args = process.argv.slice(2)
const save = () => fs.writeFileSync(statePath, JSON.stringify(state))
const output = value => process.stdout.write(JSON.stringify(value) + '\\n')
if (args[0] === '--version') {
  process.stdout.write('11.5.0\\n')
  process.exit(0)
}
if (args[0] === 'view') {
  const spec = args[1]
  const field = args[2]
  let value
  if (state.existing) {
    if (field === 'dist.shasum') value = state.registrySha1
    else if (field === 'dist.attestations') value = state.attestations
  else if (field === 'versions') {
    if (state.addLaterVersion && state.versionViews > 0 && !state.versions.includes('0.1.1')) {
      state.versions.push('0.1.1')
    }
    state.versionViews += 1
    save()
    value = state.versions
  }
    else if (field.startsWith('dist-tags.')) value = state.tag
  }
  if (value === undefined || value === null) {
    process.stderr.write('E404 404 Not Found\\n')
    process.exit(1)
  }
  output(value)
  process.exit(0)
}
if (args[0] === 'publish') {
  const bytes = fs.readFileSync(state.tarball)
  state.existing = true
  state.registrySha1 = crypto.createHash('sha1').update(bytes).digest('hex')
  state.attestations = state.publishProvenance ? { url: 'https://registry.example/provenance' } : null
  state.versions = [state.packageVersion]
  state.tag = state.packageVersion
  state.publishes += 1
  save()
  process.exit(0)
}
throw new Error('Unsupported fake npm command: ' + args.join(' '))
`
}
