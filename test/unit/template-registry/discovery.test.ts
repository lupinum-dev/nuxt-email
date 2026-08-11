import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  discoverEmailTemplates,
  templatesFromSourcePaths,
} from '../../../src/template-registry/discovery'
import {
  DuplicateEmailTemplateError,
  EmailTemplateDiscoveryError,
} from '../../../src/template-registry/discovery-errors'

const temporaryDirectories: string[] = []
const normalizedPath = (value: string): string => value.replaceAll('\\', '/')

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'nuxt-email-discovery-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => {
    return rm(directory, { force: true, recursive: true })
  }))
})

describe('email template discovery', () => {
  it('recursively discovers Vue templates in deterministic name order', async () => {
    const directory = await temporaryDirectory()
    const emailDirectory = join(directory, 'app/emails')
    await mkdir(join(emailDirectory, 'account'), { recursive: true })
    await mkdir(join(emailDirectory, 'components'), { recursive: true })
    await writeFile(join(emailDirectory, 'z-last.vue'), '<template />')
    await writeFile(join(emailDirectory, 'account/reset-password.vue'), '<template />')
    await writeFile(join(emailDirectory, 'account/verify.vue'), '<template />')
    await writeFile(join(emailDirectory, 'components/signature.vue'), '<template />')
    await writeFile(join(emailDirectory, 'ignored.ts'), 'export {}')

    const templates = await discoverEmailTemplates(emailDirectory)

    expect(templates).toEqual([
      {
        name: 'account/reset-password',
        sourcePath: normalizedPath(join(emailDirectory, 'account/reset-password.vue')),
      },
      {
        name: 'account/verify',
        sourcePath: normalizedPath(join(emailDirectory, 'account/verify.vue')),
      },
      {
        name: 'z-last',
        sourcePath: normalizedPath(join(emailDirectory, 'z-last.vue')),
      },
    ])
  })

  it('returns an empty list when app/emails does not exist', async () => {
    const directory = await temporaryDirectory()

    await expect(discoverEmailTemplates(join(directory, 'app/emails'))).resolves.toEqual([])
  })

  it('rejects paths outside the canonical email directory', () => {
    const emailDirectory = resolve('/project/app/emails')
    const sourcePath = resolve('/project/app/not-an-email.vue')

    expect(() => templatesFromSourcePaths(emailDirectory, [sourcePath]))
      .toThrowError(EmailTemplateDiscoveryError)
  })

  it('rejects duplicate normalized names with deterministic source details', () => {
    const emailDirectory = resolve('/project/app/emails')
    const sourcePath = join(emailDirectory, 'welcome.vue')

    expect(() => templatesFromSourcePaths(emailDirectory, [sourcePath, sourcePath]))
      .toThrowError(new DuplicateEmailTemplateError('welcome', [normalizedPath(sourcePath), normalizedPath(sourcePath)]))
  })
})
