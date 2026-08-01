import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import { afterEach, describe, expect, it } from 'vitest'
import NuxtEmail from '../src/module'

const temporaryDirectories: string[] = []
const workspaceDirectory = fileURLToPath(new URL('..', import.meta.url))

async function loadFixtureNuxt(options?: Record<string, unknown>) {
  const rootDir = await mkdtemp(join(tmpdir(), 'nuxt-email-options-'))
  temporaryDirectories.push(rootDir)
  await mkdir(join(rootDir, 'app'), { recursive: true })
  await writeFile(join(rootDir, 'app/app.vue'), '<template><div>fixture</div></template>')

  return loadNuxt({
    cwd: workspaceDirectory,
    dev: false,
    overrides: {
      compatibilityDate: '2025-07-15',
      devtools: { enabled: false },
      modules: options ? [[NuxtEmail, options] as never] : [NuxtEmail],
      modulesDir: [join(workspaceDirectory, 'node_modules')],
      rootDir,
    },
    ready: false,
  })
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => {
    return rm(directory, { force: true, recursive: true })
  }))
})

describe('Nuxt email module options', () => {
  it('installs without options', async () => {
    const nuxt = await loadFixtureNuxt()

    try {
      await expect(nuxt.ready()).resolves.toBeUndefined()
    }
    finally {
      await nuxt.close()
    }
  })

  it('rejects arbitrary options at runtime', async () => {
    const nuxt = await loadFixtureNuxt({ arbitrary: true })

    try {
      await expect(nuxt.ready()).rejects.toMatchObject({
        message: 'nuxt-email received unsupported module options: arbitrary',
        name: 'TypeError',
      })
    }
    finally {
      await nuxt.close()
    }
  })

  it('accepts a closed code-block language and theme configuration', async () => {
    const nuxt = await loadFixtureNuxt({
      codeBlock: {
        languages: ['typescript', 'vue'],
        theme: 'github-dark',
      },
    })

    try {
      await expect(nuxt.ready()).resolves.toBeUndefined()
    }
    finally {
      await nuxt.close()
    }
  })

  it.each([
    [
      { codeBlock: { languages: [], theme: 'github-dark' } },
      'nuxt-email codeBlock.languages must be a non-empty array',
    ],
    [
      { codeBlock: { languages: ['not-a-real-language'], theme: 'github-dark' } },
      'nuxt-email codeBlock language "not-a-real-language" is not available in Shiki',
    ],
    [
      { codeBlock: { languages: ['typescript', 'typescript'], theme: 'github-dark' } },
      'nuxt-email codeBlock language "typescript" is configured more than once',
    ],
    [
      { codeBlock: { languages: ['typescript'], theme: 'not-a-real-theme' } },
      'nuxt-email codeBlock theme "not-a-real-theme" is not available in Shiki',
    ],
    [
      { codeBlock: { languages: ['typescript'], theme: 'github-dark', futureMode: true } },
      'nuxt-email codeBlock received unknown option: futureMode',
    ],
  ])('rejects invalid code-block configuration %#', async (options, message) => {
    const nuxt = await loadFixtureNuxt(options)

    try {
      await expect(nuxt.ready()).rejects.toMatchObject({
        message,
        name: 'TypeError',
      })
    }
    finally {
      await nuxt.close()
    }
  })
})
