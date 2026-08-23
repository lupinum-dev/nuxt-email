import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join, resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '..')
const workflow = parse(readFileSync(resolve(root, '.github/workflows/publish.yml'), 'utf8'))

const stepProgram = (jobName, stepName) => {
  const program = workflow.jobs?.[jobName]?.steps?.find(step => step.name === stepName)?.run
  assert.equal(typeof program, 'string', `Missing ${jobName} step ${stepName}.`)
  return program
}

const protectedRun = stepProgram('publish', 'Publish or verify the certified tarball').trim()
const protectedMatch = /^node --input-type=module <<'NODE'\n([\s\S]+)\nNODE$/u.exec(protectedRun)
assert(protectedMatch, 'The protected release program must remain extractable for fixtures.')
const protectedProgram = protectedMatch[1]

const sourceSha = 'a'.repeat(40)
const releaseVersion = '1.2.3'
const packageName = '@lupinum/nuxt-email'
const tarball = 'lupinum-nuxt-email.tgz'
const tarballBytes = Buffer.from('certified Nuxt Email tarball')
const tarballSha1 = createHash('sha1').update(tarballBytes).digest('hex')
const tarballSha512 = createHash('sha512').update(tarballBytes).digest('hex')
const provenance = {
  url: `https://registry.npmjs.org/-/npm/v1/attestations/${encodeURIComponent(packageName)}@${releaseVersion}`,
  provenance: { predicateType: 'https://slsa.dev/provenance/v1' },
}
const provenanceBundle = {
  dsseEnvelope: { payload: 'certified-provenance-fixture' },
  mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json',
}
const provenanceDocument = {
  attestations: [{
    predicateType: 'https://slsa.dev/provenance/v1',
    bundle: provenanceBundle,
  }],
}
const provenanceBundleSha256 = createHash('sha256')
  .update(JSON.stringify(provenanceBundle))
  .digest('hex')

const fakeNpmSource = `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require('node:fs')
const fixturePath = process.env.NPM_FIXTURE
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'))
const args = process.argv.slice(2)
const save = () => writeFileSync(fixturePath, JSON.stringify(fixture))
const output = value => process.stdout.write(JSON.stringify(value) + '\\n')
if (args.length === 1 && args[0] === '--version') {
  process.stdout.write('11.18.0\\n')
  process.exit(0)
}
if (args[0] === 'view') {
  const key = args[1] + ' ' + args[2]
  const value = fixture.views[key]
  if (value === undefined || value === null) {
    process.stderr.write('E404 404 Not Found\\n')
    process.exit(1)
  }
  output(value)
  process.exit(0)
}
if (args[0] === 'publish') {
  fixture.publishes += 1
  const spec = fixture.packageName + '@' + fixture.packageVersion
  fixture.views[spec + ' version'] = fixture.packageVersion
  fixture.views[spec + ' dist.shasum'] = fixture.sha1
  fixture.views[spec + ' dist.attestations'] = fixture.provenance
  fixture.views[fixture.packageName + ' dist-tags.latest'] = fixture.packageVersion
  save()
  process.exit(0)
}
process.stderr.write('Unexpected npm command: ' + args.join(' ') + '\\n')
process.exit(2)
`

const mockFetchSource = `import { readFileSync } from 'node:fs'
const fixture = JSON.parse(readFileSync(process.env.FETCH_FIXTURE, 'utf8'))
globalThis.fetch = async (input, options) => {
  const url = String(input)
  if (options?.redirect !== 'error') throw new Error('Redirects must fail closed.')
  if (!fixture[url]) return new Response('Not found', { status: 404 })
  return new Response(JSON.stringify(fixture[url]), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}
`

const runProtected = ({
  recordState,
  registryPresent = true,
  attestations = provenance,
  attestationDocument = provenanceDocument,
  versions = [releaseVersion],
  allowBootstrap = false,
  recordChange,
}) => {
  const directory = mkdtempSync(join(tmpdir(), 'nuxt-email-protected-release-'))
  try {
    const releaseDir = join(directory, '.release')
    const binDir = join(directory, 'bin')
    mkdirSync(releaseDir)
    mkdirSync(binDir)
    const manifest = { packageName, packageVersion: releaseVersion, commit: sourceSha, tarball }
    const record = {
      schemaVersion: 1,
      packageName,
      packageVersion: releaseVersion,
      sourceSha,
      tarball,
      tarballSha1,
      tarballSha512,
      registryState: recordState,
      registryShasum: recordState === 'absent' ? null : tarballSha1,
      provenanceBundleSha256: recordState === 'verified-existing' ? provenanceBundleSha256 : null,
    }
    recordChange?.(record)
    writeFileSync(join(releaseDir, 'release-artifact.json'), JSON.stringify(manifest))
    writeFileSync(join(releaseDir, 'registry-verification.json'), JSON.stringify(record))
    writeFileSync(join(releaseDir, tarball), tarballBytes)

    const spec = `${packageName}@${releaseVersion}`
    const views = {
      [`${packageName} versions`]: versions,
      [`${packageName} dist-tags.latest`]: releaseVersion,
    }
    if (registryPresent) {
      views[`${spec} version`] = releaseVersion
      views[`${spec} dist.shasum`] = tarballSha1
      views[`${spec} dist.attestations`] = attestations
    }
    const npmFixture = join(directory, 'npm-fixture.json')
    writeFileSync(npmFixture, JSON.stringify({
      packageName,
      packageVersion: releaseVersion,
      provenance,
      publishes: 0,
      sha1: tarballSha1,
      views,
    }))
    const fakeNpm = join(binDir, 'npm')
    writeFileSync(fakeNpm, fakeNpmSource)
    chmodSync(fakeNpm, 0o755)
    const fetchFixture = join(directory, 'fetch-fixture.json')
    writeFileSync(fetchFixture, JSON.stringify({
      [attestations?.url ?? provenance.url]: attestationDocument,
    }))
    const mockFetch = join(directory, 'mock-fetch.mjs')
    writeFileSync(mockFetch, mockFetchSource)
    const outputPath = join(directory, 'output.txt')
    writeFileSync(outputPath, '')
    const summaryPath = join(directory, 'summary.md')
    writeFileSync(summaryPath, '')

    const result = spawnSync(
      process.execPath,
      ['--import', mockFetch, '--input-type=module', '--eval', protectedProgram],
      {
        cwd: directory,
        encoding: 'utf8',
        env: {
          ...process.env,
          ALLOW_BOOTSTRAP: String(allowBootstrap),
          GITHUB_OUTPUT: outputPath,
          GITHUB_SHA: sourceSha,
          GITHUB_STEP_SUMMARY: summaryPath,
          FETCH_FIXTURE: fetchFixture,
          NPM_FIXTURE: npmFixture,
          PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
          REGISTRY_POLL_ATTEMPTS: '1',
          REGISTRY_POLL_DELAY_MS: '0',
          RELEASE_VERSION: releaseVersion,
        },
      },
    )
    return {
      output: readFileSync(outputPath, 'utf8'),
      result,
      state: JSON.parse(readFileSync(npmFixture, 'utf8')),
    }
  }
  finally {
    rmSync(directory, { recursive: true })
  }
}

const completeRegistry = runProtected({ recordState: 'verified-existing' })
assert.equal(completeRegistry.result.status, 0, completeRegistry.result.stderr)
assert.equal(completeRegistry.state.publishes, 0, 'Verified existing bytes must not be republished.')
assert.match(completeRegistry.output, /bootstrap=false/u)

const incompleteRegistry = runProtected({ recordState: 'verified-existing', attestations: {} })
assert.notEqual(incompleteRegistry.result.status, 0, 'Incomplete provenance metadata must fail.')
assert.match(incompleteRegistry.result.stderr, /current npm provenance metadata is incomplete/u)

const changedProvenanceUrl = runProtected({
  recordState: 'verified-existing',
  attestations: {
    ...provenance,
    url: 'https://registry.npmjs.org/package/-/provenance',
  },
})
assert.notEqual(changedProvenanceUrl.result.status, 0, 'An untrusted provenance URL must fail.')
assert.match(changedProvenanceUrl.result.stderr, /outside the registry attestation API/u)

const changedProvenanceBundle = runProtected({
  recordState: 'verified-existing',
  attestationDocument: {
    attestations: [{
      predicateType: 'https://slsa.dev/provenance/v1',
      bundle: { ...provenanceBundle, changed: true },
    }],
  },
})
assert.notEqual(changedProvenanceBundle.result.status, 0, 'A changed provenance bundle must fail.')
assert.match(changedProvenanceBundle.result.stderr, /provenance bundle changed after verification/u)

const multipleProvenanceBundles = runProtected({
  recordState: 'verified-existing',
  attestationDocument: {
    attestations: [
      ...provenanceDocument.attestations,
      structuredClone(provenanceDocument.attestations[0]),
    ],
  },
})
assert.notEqual(multipleProvenanceBundles.result.status, 0, 'Multiple provenance bundles must fail.')
assert.match(multipleProvenanceBundles.result.stderr, /no unique provenance bundle/u)

const unverifiedRecord = runProtected({
  recordState: 'verified-existing',
  recordChange: (record) => { record.provenanceBundleSha256 = null },
})
assert.notEqual(unverifiedRecord.result.status, 0, 'Existing bytes require a provenance verification hash.')
assert.match(unverifiedRecord.result.stderr, /Registry verification record does not match/u)

const registryRace = runProtected({ recordState: 'absent', registryPresent: true })
assert.notEqual(registryRace.result.status, 0, 'A version appearing after verification must fail closed.')
assert.match(registryRace.result.stderr, /registry existence or bytes changed after verification/u)
assert.equal(registryRace.state.publishes, 0)

const newPublication = runProtected({ recordState: 'absent', registryPresent: false })
assert.equal(newPublication.result.status, 0, newPublication.result.stderr)
assert.equal(newPublication.state.publishes, 1)

const bootstrap = runProtected({
  recordState: 'verified-bootstrap',
  attestations: null,
  allowBootstrap: true,
})
assert.equal(bootstrap.result.status, 0, bootstrap.result.stderr)
assert.equal(bootstrap.state.publishes, 0)
assert.match(bootstrap.output, /bootstrap=true/u)

const unauthorizedBootstrap = runProtected({
  recordState: 'verified-bootstrap',
  attestations: null,
})
assert.notEqual(unauthorizedBootstrap.result.status, 0)
assert.match(unauthorizedBootstrap.result.stderr, /Registry verification record does not match/u)

const changedBootstrap = runProtected({
  recordState: 'verified-bootstrap',
  attestations: null,
  versions: [releaseVersion, '1.2.4'],
  allowBootstrap: true,
})
assert.notEqual(changedBootstrap.result.status, 0)
assert.match(changedBootstrap.result.stderr, /bootstrap registry state changed after verification/u)

const githubReleaseProgram = stepProgram(
  'github-release',
  'Create or repair the release for the published commit',
)
const fakeCurlSource = `#!/usr/bin/env node
const { readFileSync } = require('node:fs')
const fixture = JSON.parse(readFileSync(process.env.GH_FIXTURE, 'utf8'))
const url = process.argv.at(-1)
if (url.includes('/releases/tags/')) process.stdout.write(fixture.releaseExists ? '200' : '404')
else process.stdout.write(fixture.tag ? '200' : '404')
`

const fakeGhSource = `#!/usr/bin/env node
const { appendFileSync, readFileSync, writeFileSync } = require('node:fs')
const fixture = JSON.parse(readFileSync(process.env.GH_FIXTURE, 'utf8'))
const args = process.argv.slice(2)
appendFileSync(process.env.GH_LOG, JSON.stringify(args) + '\\n')
const save = () => writeFileSync(process.env.GH_FIXTURE, JSON.stringify(fixture))
if (args[0] === 'api') {
  const endpoint = args.find(value => value.startsWith('repos/')) || ''
  const methodIndex = args.indexOf('--method')
  const method = methodIndex === -1 ? 'GET' : args[methodIndex + 1]
  if (method === 'POST' && endpoint.endsWith('/git/refs')) {
    if (fixture.tagOnCreateConflict) {
      fixture.tag = fixture.tagOnCreateConflict
      save()
      process.stderr.write('Reference already exists\\n')
      process.exit(1)
    }
    if (fixture.tag) {
      process.stderr.write('Reference already exists\\n')
      process.exit(1)
    }
    const ref = args.find(value => value.startsWith('ref='))?.slice(4)
    const sha = args.find(value => value.startsWith('sha='))?.slice(4)
    if (ref !== 'refs/tags/v' + process.env.RELEASE_VERSION || sha !== process.env.SOURCE_SHA) {
      process.stderr.write('Unexpected tag creation coordinates\\n')
      process.exit(2)
    }
    fixture.tag = { type: 'commit', sha }
    fixture.actions.push('create-tag')
    save()
    process.exit(0)
  }
  const tagObject = endpoint.match(/\\/git\\/tags\\/([0-9a-f]+)$/)
  if (tagObject && fixture.peeled[tagObject[1]]) {
    const target = fixture.peeled[tagObject[1]]
    const jq = args[args.indexOf('--jq') + 1]
    if (jq === '.object.type') process.stdout.write(target.type + '\\n')
    else if (jq === '.object.sha') process.stdout.write(target.sha + '\\n')
    else process.exit(2)
    process.exit(0)
  }
  if (endpoint.includes('/git/ref/tags/')) {
    if (!fixture.tag) {
      process.stderr.write('Tag does not exist\\n')
      process.exit(1)
    }
    const jq = args[args.indexOf('--jq') + 1]
    if (jq === '.object.type') process.stdout.write(fixture.tag.type + '\\n')
    else if (jq === '.object.sha') process.stdout.write(fixture.tag.sha + '\\n')
    else process.exit(2)
    process.exit(0)
  }
  process.stderr.write('Unexpected gh api endpoint: ' + endpoint + '\\n')
  process.exit(2)
}
if (args[0] === 'release' && ['upload', 'edit', 'create'].includes(args[1])) {
  if (args[1] === 'create' && (!fixture.tag || !args.includes('--verify-tag'))) {
    process.stderr.write('Verified tag is required\\n')
    process.exit(1)
  }
  fixture.actions.push(args[1] + '-release')
  save()
  process.exit(0)
}
process.stderr.write('Unexpected gh command: ' + args.join(' ') + '\\n')
process.exit(2)
`

const runGithubRelease = ({
  version,
  tag,
  tagOnCreateConflict,
  peeled = {},
  releaseExists,
  bootstrap = false,
}) => {
  const directory = mkdtempSync(join(tmpdir(), 'nuxt-email-github-release-'))
  try {
    const releaseDir = join(directory, '.release')
    const binDir = join(directory, 'bin')
    mkdirSync(releaseDir)
    mkdirSync(binDir)
    writeFileSync(join(releaseDir, 'release-artifact.json'), JSON.stringify({ tarball }))
    writeFileSync(join(releaseDir, 'release-notes.md'), 'Release notes\n')
    writeFileSync(join(releaseDir, tarball), tarballBytes)

    const ghFixture = join(directory, 'gh-fixture.json')
    const ghLog = join(directory, 'gh.log')
    writeFileSync(ghFixture, JSON.stringify({
      actions: [],
      tag,
      tagOnCreateConflict,
      peeled,
      releaseExists,
    }))
    writeFileSync(ghLog, '')
    const fakeGh = join(binDir, 'gh')
    writeFileSync(fakeGh, fakeGhSource)
    chmodSync(fakeGh, 0o755)
    const fakeCurl = join(binDir, 'curl')
    writeFileSync(fakeCurl, fakeCurlSource)
    chmodSync(fakeCurl, 0o755)

    const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', githubReleaseProgram], {
      cwd: directory,
      encoding: 'utf8',
      env: {
        ...process.env,
        BOOTSTRAP_RELEASE: String(bootstrap),
        GH_FIXTURE: ghFixture,
        GH_LOG: ghLog,
        GH_TOKEN: 'fixture',
        GITHUB_API_URL: 'https://api.github.test',
        GITHUB_REPOSITORY: 'lupinum-dev/nuxt-email',
        GITHUB_SHA: sourceSha,
        PATH: `${binDir}${delimiter}${process.env.PATH ?? ''}`,
        RELEASE_VERSION: version,
        SOURCE_SHA: sourceSha,
      },
    })
    const calls = readFileSync(ghLog, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line))
    const notes = readFileSync(join(releaseDir, 'release-notes.md'), 'utf8')
    const state = JSON.parse(readFileSync(ghFixture, 'utf8'))
    return { calls, notes, result, state }
  }
  finally {
    rmSync(directory, { recursive: true })
  }
}

const stableRepair = runGithubRelease({
  version: releaseVersion,
  tag: { type: 'commit', sha: sourceSha },
  releaseExists: true,
})
assert.equal(stableRepair.result.status, 0, stableRepair.result.stderr)
const stableEdit = stableRepair.calls.find(args => args[0] === 'release' && args[1] === 'edit')
assert(stableEdit?.includes('--prerelease=false'), 'Stable repair must clear prerelease state.')
assert(
  stableRepair.calls.findIndex(args => args[0] === 'api' && args[1].includes('/git/ref/tags/'))
  < stableRepair.calls.findIndex(args => args[0] === 'release' && args[1] === 'upload'),
  'The tag must be re-read and verified before release repair.',
)
assert(
  stableRepair.calls.some(args => args[0] === 'release' && args[1] === 'upload' && args.includes('--clobber')),
  'Asset repair must replace the named certified tarball only after tag verification.',
)

const annotatedTagSha = 'b'.repeat(40)
const prereleaseRepair = runGithubRelease({
  version: '1.2.3-beta.1',
  tag: { type: 'tag', sha: annotatedTagSha },
  peeled: { [annotatedTagSha]: { type: 'commit', sha: sourceSha } },
  releaseExists: true,
})
assert.equal(prereleaseRepair.result.status, 0, prereleaseRepair.result.stderr)
assert(
  prereleaseRepair.calls.some(args => args[0] === 'api' && args[1].endsWith(`/git/tags/${annotatedTagSha}`)),
  'Annotated tags must be peeled to their commit.',
)
const prereleaseEdit = prereleaseRepair.calls.find(args => args[0] === 'release' && args[1] === 'edit')
assert(prereleaseEdit?.includes('--prerelease'), 'Prerelease repair must set prerelease state.')
assert(!prereleaseEdit?.includes('--prerelease=false'))

const conflictingTag = runGithubRelease({
  version: releaseVersion,
  tag: { type: 'commit', sha: 'c'.repeat(40) },
  releaseExists: false,
})
assert.notEqual(conflictingTag.result.status, 0, 'A conflicting tag must stop release creation.')
assert(!conflictingTag.calls.some(args => args[0] === 'release' && ['create', 'edit', 'upload'].includes(args[1])))

const freshRelease = runGithubRelease({ version: releaseVersion, tag: null, releaseExists: false })
assert.equal(freshRelease.result.status, 0, freshRelease.result.stderr)
const createCall = freshRelease.calls.find(args => args[0] === 'release' && args[1] === 'create')
assert(createCall?.includes('--verify-tag'), 'Release creation must consume the atomically created tag.')
assert(!createCall?.includes('--target'), 'Release creation must never race by creating its own tag.')
assert(!createCall?.includes('--prerelease'))
assert.deepEqual(freshRelease.state.actions, ['create-tag', 'create-release'])

const existingTagWithoutRelease = runGithubRelease({
  version: releaseVersion,
  tag: { type: 'commit', sha: sourceSha },
  releaseExists: false,
})
assert.equal(existingTagWithoutRelease.result.status, 0, existingTagWithoutRelease.result.stderr)
assert.deepEqual(existingTagWithoutRelease.state.actions, ['create-release'])

for (const [name, tagOnCreateConflict] of [
  ['matching', { type: 'commit', sha: sourceSha }],
  ['conflicting', { type: 'commit', sha: 'd'.repeat(40) }],
]) {
  const racedTag = runGithubRelease({
    version: releaseVersion,
    tag: null,
    tagOnCreateConflict,
    releaseExists: false,
  })
  assert.notEqual(racedTag.result.status, 0, `${name} concurrent tag creation must fail closed.`)
  assert.match(racedTag.result.stderr, /Reference already exists/u)
  assert.deepEqual(racedTag.state.actions, [], 'A tag creation conflict must not mutate the Release.')
}

const orphanedRelease = runGithubRelease({ version: releaseVersion, tag: null, releaseExists: true })
assert.notEqual(orphanedRelease.result.status, 0, 'Release repair requires its existing tag.')
assert(!orphanedRelease.calls.some(args => args[0] === 'release' && ['edit', 'upload'].includes(args[1])))

const bootstrapRepair = runGithubRelease({
  version: releaseVersion,
  tag: { type: 'commit', sha: sourceSha },
  releaseExists: true,
  bootstrap: true,
})
assert.match(bootstrapRepair.notes, /before npm trusted publishing could be configured/u)

process.stdout.write('Protected release recovery fixtures passed.\n')
