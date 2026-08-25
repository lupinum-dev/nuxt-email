import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  MAIN_REF,
  PROVENANCE_TYPE,
  REPOSITORY_URL,
  WORKFLOW_PATH,
  createRegistryVerificationRecord,
  fetchAttestations,
  sigstorePolicy,
  validateProvenanceStatement,
} from './verify-npm-recovery.mjs'

const manifest = {
  packageName: '@lupinum/nuxt-email',
  packageVersion: '1.0.0-beta.1',
  commit: 'a'.repeat(40),
  tarball: 'lupinum-nuxt-email.tgz',
}
const tarballBytes = Buffer.from('certified Nuxt Email tarball')
const sha1 = createHash('sha1').update(tarballBytes).digest('hex')
const sha512 = createHash('sha512').update(tarballBytes).digest('hex')

const statement = () => ({
  _type: 'https://in-toto.io/Statement/v1',
  subject: [{ name: 'pkg:npm/%40lupinum/nuxt-email@1.0.0-beta.1', digest: { sha512 } }],
  predicateType: PROVENANCE_TYPE,
  predicate: {
    buildDefinition: {
      externalParameters: { workflow: { ref: MAIN_REF, repository: REPOSITORY_URL, path: WORKFLOW_PATH } },
      resolvedDependencies: [{
        uri: `git+${REPOSITORY_URL}@${MAIN_REF}`,
        digest: { gitCommit: manifest.commit },
      }],
    },
    runDetails: { builder: { id: 'https://github.com/actions/runner/github-hosted' } },
  },
})

const bundle = (value = statement()) => ({
  mediaType: 'application/vnd.dev.sigstore.bundle.v0.3+json',
  dsseEnvelope: {
    payloadType: 'application/vnd.in-toto+json',
    payload: Buffer.from(JSON.stringify(value)).toString('base64'),
    signatures: [{ sig: 'fixture' }],
  },
  verificationMaterial: {},
})

validateProvenanceStatement(statement(), manifest, sha512)
for (const [name, mutate] of [
  ['predicate type', value => (value.predicateType = 'wrong')],
  ['subject', value => (value.subject[0].name = 'pkg:npm/wrong@1.0.0-beta.1')],
  ['tarball digest', value => (value.subject[0].digest.sha512 = '0'.repeat(128))],
  ['extra subject', value => value.subject.push(structuredClone(value.subject[0]))],
  ['workflow repository', value => (value.predicate.buildDefinition.externalParameters.workflow.repository = 'https://github.com/example/wrong')],
  ['workflow path', value => (value.predicate.buildDefinition.externalParameters.workflow.path = '.github/workflows/wrong.yml')],
  ['workflow ref', value => (value.predicate.buildDefinition.externalParameters.workflow.ref = 'refs/heads/wrong')],
  ['source sha', value => (value.predicate.buildDefinition.resolvedDependencies[0].digest.gitCommit = 'b'.repeat(40))],
  ['builder', value => (value.predicate.runDetails.builder.id = 'https://github.com/example/runner')],
]) {
  const value = statement()
  mutate(value)
  assert.throws(
    () => validateProvenanceStatement(value, manifest, sha512),
    /does not match the certified workflow, source, and tarball/u,
    `${name} must be rejected`,
  )
}

const policy = sigstorePolicy(manifest.commit)
assert.equal(policy.certificateIssuer, 'https://token.actions.githubusercontent.com')
assert.equal(
  policy.certificateIdentityURI,
  '^https://github\\.com/lupinum-dev/nuxt-email/\\.github/workflows/publish\\.yml@refs/heads/main$',
)
assert.deepEqual(policy.certificateOIDs, {
  '1.3.6.1.4.1.57264.1.3': manifest.commit,
  '1.3.6.1.4.1.57264.1.5': 'lupinum-dev/nuxt-email',
  '1.3.6.1.4.1.57264.1.6': MAIN_REF,
})

const attestationUrl = 'https://registry.npmjs.org/-/npm/v1/attestations/%40lupinum%2Fnuxt-email@1.0.0-beta.1'
const originalFetch = globalThis.fetch
try {
  let fetchOptions
  globalThis.fetch = async (_url, options) => {
    fetchOptions = options
    return { ok: true, json: async () => ({ attestations: [] }) }
  }
  assert.deepEqual(await fetchAttestations({ url: attestationUrl }), { attestations: [] })
  assert.equal(fetchOptions.redirect, 'error')
  assert(fetchOptions.signal instanceof AbortSignal)

  for (const [name, url] of [
    ['credentials', 'https://user:secret@registry.npmjs.org/-/npm/v1/attestations/package'],
    ['query', `${attestationUrl}?redirect=example`],
    ['hash', `${attestationUrl}#fragment`],
    ['alternate port', 'https://registry.npmjs.org:444/-/npm/v1/attestations/package'],
  ]) {
    await assert.rejects(
      fetchAttestations({ url }),
      /outside the registry attestation API/u,
      `${name} must be rejected before the attestation fetch`,
    )
  }

  globalThis.fetch = async (_url, options) => {
    if (options.redirect === 'error') throw new TypeError('redirect rejected')
    return { ok: true, json: async () => ({ attestations: [] }) }
  }
  await assert.rejects(fetchAttestations({ url: attestationUrl }), /redirect rejected/u)
}
finally {
  globalThis.fetch = originalFetch
}

let verifyArguments
const existingRecord = await createRegistryVerificationRecord({
  manifest,
  tarballBytes,
  registryShasum: sha1,
  attestationDocument: { attestations: [{ predicateType: PROVENANCE_TYPE, bundle: bundle() }] },
  verifyBundle: async (...args) => { verifyArguments = args },
})
assert.equal(verifyArguments.length, 2, 'Sigstore DSSE policy must be its second argument.')
assert.deepEqual(verifyArguments[1], policy)
assert.equal(existingRecord.registryState, 'verified-existing')
assert.match(existingRecord.provenanceBundleSha256, /^[0-9a-f]{64}$/u)
assert.equal(existingRecord.tarballSha512, sha512)

const absentRecord = await createRegistryVerificationRecord({
  manifest,
  tarballBytes,
  registryShasum: null,
  attestationDocument: null,
  verifyBundle: () => assert.fail('Absent versions must not invoke Sigstore.'),
})
assert.equal(absentRecord.registryState, 'absent')

await assert.rejects(
  createRegistryVerificationRecord({ manifest, tarballBytes, registryShasum: sha1, attestationDocument: null }),
  /exists without verifiable npm provenance/u,
)
await assert.rejects(
  createRegistryVerificationRecord({ manifest, tarballBytes, registryShasum: '0'.repeat(40), attestationDocument: null }),
  /exists with different bytes/u,
)
await assert.rejects(
  createRegistryVerificationRecord({
    manifest,
    tarballBytes,
    registryShasum: sha1,
    attestationDocument: { attestations: [
      { predicateType: PROVENANCE_TYPE, bundle: bundle() },
      { predicateType: PROVENANCE_TYPE, bundle: bundle() },
    ] },
  }),
  /has no unique npm provenance/u,
)

const sigstorePrefix = (version) => {
  const prefix = mkdtempSync(join(tmpdir(), 'nuxt-email-sigstore-'))
  const packageDir = join(prefix, 'node_modules', 'sigstore')
  mkdirSync(packageDir, { recursive: true })
  writeFileSync(join(packageDir, 'package.json'), JSON.stringify({ name: 'sigstore', version, main: 'index.cjs' }))
  writeFileSync(join(packageDir, 'index.cjs'), 'exports.verify = async () => {};\n')
  return prefix
}

const previousPrefix = process.env.SIGSTORE_PREFIX
const exactPrefix = sigstorePrefix('5.0.0')
const wrongPrefix = sigstorePrefix('4.1.1')
try {
  process.env.SIGSTORE_PREFIX = exactPrefix
  const isolatedRecord = await createRegistryVerificationRecord({
    manifest,
    tarballBytes,
    registryShasum: sha1,
    attestationDocument: { attestations: [{ predicateType: PROVENANCE_TYPE, bundle: bundle() }] },
    publishedVersions: [manifest.packageVersion],
  })
  assert.equal(isolatedRecord.registryState, 'verified-existing')

  process.env.SIGSTORE_PREFIX = wrongPrefix
  await assert.rejects(
    createRegistryVerificationRecord({
      manifest,
      tarballBytes,
      registryShasum: sha1,
      attestationDocument: { attestations: [{ predicateType: PROVENANCE_TYPE, bundle: bundle() }] },
      publishedVersions: [manifest.packageVersion],
    }),
    /Expected sigstore 5\.0\.0, received 4\.1\.1/u,
  )
}
finally {
  if (previousPrefix === undefined) delete process.env.SIGSTORE_PREFIX
  else process.env.SIGSTORE_PREFIX = previousPrefix
  rmSync(exactPrefix, { recursive: true })
  rmSync(wrongPrefix, { recursive: true })
}

process.stdout.write('npm recovery verification fixtures passed.\n')
