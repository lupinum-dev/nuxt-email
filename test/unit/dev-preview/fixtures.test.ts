import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  attachPreviewFixtures,
  previewFixturePath,
} from '../../../src/dev-preview/fixtures'

const temporaryDirectories: string[] = []

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'nuxt-email-preview-fixtures-'))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => {
    return rm(directory, { force: true, recursive: true })
  }))
})

describe('preview fixture attachment', () => {
  it('recognizes only the exact colocated sibling fixtures file', async () => {
    const directory = await temporaryDirectory()
    const sourcePath = join(directory, 'account/reset-password.vue')
    const fixturePath = join(directory, 'account/reset-password.fixtures.ts')
    await mkdir(join(directory, 'account'), { recursive: true })
    await writeFile(sourcePath, '<template />')
    await writeFile(fixturePath, 'export default { code: "123456" }')
    await writeFile(join(directory, 'account/reset-password.fixture.ts'), 'export default {}')

    const templates = await attachPreviewFixtures([{
      name: 'account/reset-password',
      sourcePath,
    }])

    expect(templates).toEqual([{
      name: 'account/reset-password',
      sourcePath,
      fixturePath,
    }])
  })

  it('leaves templates without an exact regular fixture file unattached', async () => {
    const directory = await temporaryDirectory()
    const sourcePath = join(directory, 'welcome.vue')
    await writeFile(sourcePath, '<template />')
    await mkdir(join(directory, 'welcome.fixtures.ts'))

    await expect(attachPreviewFixtures([{ name: 'welcome', sourcePath }])).resolves.toEqual([{
      name: 'welcome',
      sourcePath,
    }])
  })

  it('derives the fixture name without matching similarly named files', () => {
    expect(previewFixturePath('/project/app/emails/welcome.vue'))
      .toBe('/project/app/emails/welcome.fixtures.ts')
  })
})
