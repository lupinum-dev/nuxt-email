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
        message: 'nuxt-email does not accept module options; received: arbitrary',
        name: 'TypeError',
      })
    }
    finally {
      await nuxt.close()
    }
  })
})
