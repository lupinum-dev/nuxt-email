import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { consumerFrameworkVersions, installedFrameworkVersions } from '../scripts/test-packed'

const source = {
  peerDependencies: { nuxt: '>=4.1.0 <5', vue: '^3.2.0' },
  devDependencies: { nuxt: '4.2.1', vue: '3.5.2' },
}

test('consumer endpoints follow the public floors and current development versions', () => {
  expect(consumerFrameworkVersions(source)).toEqual([
    { nuxt: '4.1.0', vue: '3.2.0' },
    { nuxt: '4.2.1', vue: '3.5.2' },
  ])
  expect(consumerFrameworkVersions({
    ...source,
    devDependencies: { nuxt: '4.1.0', vue: '3.2.0' },
  })).toHaveLength(1)
})

test('unsupported and incompatible version declarations fail instead of guessing coverage', () => {
  expect(() => consumerFrameworkVersions({ ...source, peerDependencies: { ...source.peerDependencies, nuxt: '>=4.1.0' } })).toThrow('bounded Nuxt range')
  expect(() => consumerFrameworkVersions({ ...source, peerDependencies: { ...source.peerDependencies, vue: '>=3' } })).toThrow('caret Vue range')
  expect(() => consumerFrameworkVersions({ ...source, devDependencies: { ...source.devDependencies, vue: '^3.5.2' } })).toThrow('Pin the development Vue')
  expect(() => consumerFrameworkVersions({ ...source, devDependencies: { ...source.devDependencies, nuxt: '5.0.0' } })).toThrow('satisfy its public peer range')
  expect(() => consumerFrameworkVersions({ ...source, devDependencies: { ...source.devDependencies, vue: '3.1.9' } })).toThrow('satisfy its public peer range')
})

test('installed framework manifests must match both requested versions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nuxt-email-installed-'))
  const expected = { nuxt: '4.1.0', vue: '3.2.0' }
  try {
    for (const [name, version] of Object.entries(expected)) {
      const path = join(directory, 'node_modules', name)
      await mkdir(path, { recursive: true })
      await writeFile(join(path, 'package.json'), JSON.stringify({ version }))
    }
    await expect(installedFrameworkVersions(directory, expected)).resolves.toEqual(expected)
    await writeFile(join(directory, 'node_modules/nuxt/package.json'), JSON.stringify({ version: '4.2.0' }))
    await expect(installedFrameworkVersions(directory, expected)).rejects.toThrow('installed nuxt 4.2.0 instead of 4.1.0')
    await writeFile(join(directory, 'node_modules/nuxt/package.json'), JSON.stringify({ version: expected.nuxt }))
    await writeFile(join(directory, 'node_modules/vue/package.json'), JSON.stringify({ version: '3.5.0' }))
    await expect(installedFrameworkVersions(directory, expected)).rejects.toThrow('installed vue 3.5.0 instead of 3.2.0')
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
})
