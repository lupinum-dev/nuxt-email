import { mkdtemp, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import { afterEach, describe, expect, it } from 'vitest'
import NuxtEmail from '../src/module'

const temporaryDirectories: string[] = []
const workspaceDirectory = fileURLToPath(new URL('..', import.meta.url))

async function temporaryNuxtDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'nuxt-email-module-'))
  temporaryDirectories.push(directory)
  await mkdir(join(directory, 'app/emails/account'), { recursive: true })
  await writeFile(join(directory, 'app/app.vue'), '<template><div>fixture</div></template>')
  await writeFile(join(directory, 'app/emails/welcome.vue'), '<template><html><body>Welcome</body></html></template>')
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => {
    return rm(directory, { force: true, recursive: true })
  }))
})

describe('Nuxt email registry regeneration', () => {
  it('updates its one runtime registry and generated types for add, rename, and delete events', async () => {
    const rootDir = await temporaryNuxtDirectory()
    const nuxt = await loadNuxt({
      cwd: workspaceDirectory,
      dev: true,
      overrides: {
        compatibilityDate: '2025-07-15',
        devtools: { enabled: false },
        modulesDir: [join(workspaceDirectory, 'node_modules')],
        modules: [NuxtEmail],
        rootDir,
      },
      ready: true,
    })

    const nitroOptions = (nuxt.options as typeof nuxt.options & {
      nitro: { virtual?: Record<string, unknown> }
    }).nitro
    const registrySource = async (): Promise<string> => {
      const registry = nitroOptions.virtual?.['#nuxt-email/registry']
      expect(registry).toBeTypeOf('function')
      return await (registry as () => string | Promise<string>)()
    }
    const typeTemplate = nuxt.options.build.templates.find((template) => {
      return template.filename === 'types/nuxt-email.d.ts'
    })
    expect(typeTemplate?.getContents).toBeTypeOf('function')
    const generatedTypes = async (): Promise<string> => {
      return await typeTemplate!.getContents!({} as never)
    }

    try {
      expect(await registrySource()).toContain('["welcome"]')
      expect(await generatedTypes()).toContain('"welcome"')

      const resetPath = join(rootDir, 'app/emails/account/reset.vue')
      await writeFile(resetPath, '<template><html><body>Reset</body></html></template>')
      await nuxt.callHook('builder:watch', 'add', resetPath)

      expect(await registrySource()).toContain('["account/reset"]')
      expect(await generatedTypes()).toContain('"account/reset"')

      const welcomePath = join(rootDir, 'app/emails/welcome.vue')
      const renamedPath = join(rootDir, 'app/emails/renamed.vue')
      await rename(welcomePath, renamedPath)
      await nuxt.callHook('builder:watch', 'unlink', welcomePath)
      await nuxt.callHook('builder:watch', 'add', renamedPath)

      expect(await registrySource()).toContain('["renamed"]')
      expect(await registrySource()).not.toContain('["welcome"]')
      expect(await generatedTypes()).toContain('"renamed"')
      expect(await generatedTypes()).not.toContain('"welcome"')

      await rm(resetPath)
      await nuxt.callHook('builder:watch', 'unlink', resetPath)

      expect(await registrySource()).not.toContain('["account/reset"]')
      expect(await generatedTypes()).not.toContain('"account/reset"')
    }
    finally {
      await nuxt.close()
    }
  })
})
