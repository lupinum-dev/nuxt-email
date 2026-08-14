#!/usr/bin/env node

import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { execFileSync } from 'node:child_process'

const repositoryRoot = resolve(import.meta.dirname, '..')
const releaseDirectory = resolve(repositoryRoot, '.release')
const tarballPath = resolve(releaseDirectory, 'lupinum-nuxt-email.tgz')
const packagePath = resolve(repositoryRoot, 'package.json')

const manifest = JSON.parse(await readFile(packagePath, 'utf8'))
const tarball = await readFile(tarballPath)
const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
}).trim()
const status = execFileSync(
  'git',
  ['status', '--porcelain=v1', '--untracked-files=all'],
  { cwd: repositoryRoot, encoding: 'utf8' },
).trim()

if (status) {
  throw new Error('Refusing to certify a dirty worktree')
}

const packedManifest = JSON.parse(
  execFileSync('tar', ['-xOf', tarballPath, 'package/package.json'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }),
)

if (packedManifest.name !== manifest.name || packedManifest.version !== manifest.version) {
  throw new Error('Packed package metadata differs from package.json')
}

const evidence = {
  schemaVersion: 2,
  packageName: manifest.name,
  packageVersion: manifest.version,
  channel: manifest.version.includes('-') ? 'next' : 'latest',
  commit,
  sourceClean: true,
  tarball: basename(tarballPath),
  bytes: tarball.byteLength,
  sha1: createHash('sha1').update(tarball).digest('hex'),
  sha256: createHash('sha256').update(tarball).digest('hex'),
}

await writeFile(
  resolve(releaseDirectory, 'release-artifact.json'),
  `${JSON.stringify(evidence, null, 2)}\n`,
  { encoding: 'utf8', flag: 'wx' },
)
await writeFile(
  resolve(releaseDirectory, 'SHA256SUMS'),
  `${evidence.sha256}  ${evidence.tarball}\n`,
  { encoding: 'utf8', flag: 'wx' },
)

process.stdout.write(`Certified ${evidence.packageName}@${evidence.packageVersion}\n`)
