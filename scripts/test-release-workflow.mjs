import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parse } from 'yaml'

const root = resolve(import.meta.dirname, '..')
const publishSource = readFileSync(resolve(root, '.github/workflows/publish.yml'), 'utf8')
const ciSource = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8')
const recoverySource = readFileSync(resolve(root, 'scripts/verify-npm-recovery.mjs'), 'utf8')
const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const lockSource = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8')
const sigstoreManifest = JSON.parse(readFileSync(resolve(root, 'scripts/sigstore-verifier/package.json'), 'utf8'))
const sigstoreLock = JSON.parse(readFileSync(resolve(root, 'scripts/sigstore-verifier/package-lock.json'), 'utf8'))
const publish = parse(publishSource)
const ci = parse(ciSource)

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

assert(publish.on?.workflow_dispatch, 'Publishing must remain manually dispatched.')
assert(publish.on.workflow_dispatch.inputs?.version?.required, 'Publishing requires an exact version.')
assert(
  Object.keys(publish.on.workflow_dispatch.inputs ?? {}).join(',') === 'version',
  'Publishing must accept only the explicit release version.',
)
assert(
  publishSource.match(/while test "\$tag_type" = tag/gu)?.length === 2,
  'Both release gates must recursively peel annotated tags to their commit.',
)
assert(
  publishSource.includes('test "$current_main" = "$GITHUB_SHA"')
  && publishSource.includes('head_sha=$GITHUB_SHA'),
  'The exact current main commit must have successful push CI.',
)

const publishJob = publish.jobs?.publish
assert(publishJob?.environment === 'npm', 'Publishing must use the protected npm environment.')
assert(publishJob?.permissions?.['id-token'] === 'write', 'Publishing must use npm trusted publishing.')
assert(
  publishJob?.if === 'needs.verify.outputs.publish-required == \'true\'',
  'The protected environment must be skipped when npm already has the certified bytes.',
)

const publishJobSource
  = /^ {2}publish:\n([\s\S]*?)(?=^ {2}[a-z][a-z-]*:\n)/m.exec(publishSource)?.[1] ?? ''
const verifyJobSource
  = /^ {2}verify:\n([\s\S]*?)(?=^ {2}[a-z][a-z-]*:\n)/m.exec(publishSource)?.[1] ?? ''
for (const forbidden of [
  'actions/checkout@',
  'npm install',
  'pnpm install',
  'node scripts/',
  'sigstore',
  'signedAccessSignatureUrl',
  'dsseEnvelope',
]) {
  assert(!publishJobSource.includes(forbidden), `The privileged job must not contain ${forbidden}.`)
}
for (const required of [
  'registry-verification.json',
  'Object.keys(record).sort()',
  'record.sourceSha !== process.env.GITHUB_SHA',
  'record.tarballSha512 !== sha512',
  'currentShasum !== record.registryShasum',
  'registry existence or bytes changed after verification',
  'url.origin !== \'https://registry.npmjs.org\'',
  '!/^\\/-\\/npm\\/v1\\/attestations\\/[^/]+$/.test(url.pathname)',
  'redirect: \'error\'',
  'await fetch(url',
  '.update(JSON.stringify(attestations[0].bundle))',
  'record.provenanceBundleSha256',
  'provenance bundle changed after verification',
]) {
  assert(publishJobSource.includes(required), `Protected record enforcement is missing ${required}.`)
}
assert(
  !publishJobSource.includes('createRequire')
  && !publishJobSource.includes('SIGSTORE_PREFIX')
  && !publishJobSource.includes('npm ci'),
  'The protected provenance hash check must use only built-in runtime capabilities.',
)

const releaseJobSource = /^ {2}github-release:\n([\s\S]*)$/m.exec(publishSource)?.[1] ?? ''
for (const required of [
  'release_status=$(curl',
  'tag_status=$(curl',
  '--method POST "repos/$GITHUB_REPOSITORY/git/refs"',
  '-f ref="refs/tags/$RELEASE_TAG"',
  '-f sha="$SOURCE_SHA"',
  'git/ref/tags/$RELEASE_TAG',
  '--verify-tag',
  'HUMAN-ONLY:',
  'HTTP 403',
]) {
  assert(releaseJobSource.includes(required), `Atomic GitHub release handling is missing ${required}.`)
}
assert(!releaseJobSource.includes('--target'), 'GitHub Release creation must not implicitly create a tag.')
assert(
  publish.jobs?.['github-release']?.needs?.includes('verify')
  && publish.jobs?.['github-release']?.needs?.includes('publish')
  && publish.jobs?.['github-release']?.if?.includes('needs.publish.result == \'skipped\''),
  'Release repair must remain available after a verified npm no-op.',
)

assert(
  verifyJobSource.includes('scripts/sigstore-verifier/package.json')
  && verifyJobSource.includes('scripts/sigstore-verifier/package-lock.json')
  && verifyJobSource.includes('npm ci --prefix "$SIGSTORE_PREFIX"')
  && verifyJobSource.includes('--ignore-scripts --no-audit --no-fund')
  && verifyJobSource.includes('node scripts/verify-npm-recovery.mjs'),
  'The unprivileged verifier must install Sigstore from its complete npm lockfile.',
)
for (const forbidden of ['npm install', 'npm view sigstore', '--package-lock=false']) {
  assert(!verifyJobSource.includes(forbidden), `The verifier must not use unlocked ${forbidden}.`)
}
assert(packageJson.devDependencies?.sigstore === undefined, 'Sigstore must stay outside the workspace dependency graph.')
assert(!lockSource.includes('sigstore@5.0.0'), 'Sigstore must not enter the workspace lockfile.')
assert(
  sigstoreManifest.private === true && sigstoreManifest.dependencies?.sigstore === '5.0.0',
  'The isolated verifier manifest must pin Sigstore 5.0.0.',
)
assert(
  sigstoreLock.lockfileVersion === 3
  && sigstoreLock.packages?.['']?.dependencies?.sigstore === '5.0.0'
  && sigstoreLock.packages?.['node_modules/sigstore']?.version === '5.0.0',
  'The isolated verifier lockfile must pin Sigstore 5.0.0.',
)
for (const [path, dependency] of Object.entries(sigstoreLock.packages ?? {})) {
  if (!path) continue
  assert(
    typeof dependency.resolved === 'string'
    && dependency.resolved.startsWith('https://registry.npmjs.org/')
    && dependency.integrity?.startsWith('sha512-'),
    `The isolated verifier dependency ${path} must have registry and integrity pins.`,
  )
}
for (const required of [
  'version !== \'5.0.0\'',
  'verifyBundle ?? loadSigstoreVerifier()',
  'certificateIdentityURI',
  '\'1.3.6.1.4.1.57264.1.3\': sourceSha',
  'subjects[0]?.digest?.sha512 !== tarballSha512',
  'exists without verifiable npm provenance',
]) {
  assert(recoverySource.includes(required), `Cryptographic recovery is missing ${required}.`)
}

const verifiedUpload = publish.jobs?.verify?.steps?.find(step => step.with?.name === 'verified-nuxt-email-release')
assert(verifiedUpload?.with?.['retention-days'] === 14, 'The verified candidate must be retained for 14 days.')

const candidateUpload = ci.jobs?.test?.steps?.find(step => step.with?.name === 'nuxt-email-release')
assert(candidateUpload?.with?.['retention-days'] === 14, 'The CI candidate must be retained for 14 days.')

process.stdout.write('Release workflow structure verified.\n')
