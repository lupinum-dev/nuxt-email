import { mkdtemp, mkdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadNuxt } from '@nuxt/kit'
import { afterEach, describe, expect, it } from 'vitest'
import NuxtEmail from '../src/module'
import { EMAIL_TAGS } from '../src/runtime/components/email-tags'

const temporaryDirectories: string[] = []
const workspaceDirectory = fileURLToPath(new URL('..', import.meta.url))

async function temporaryNuxtDirectory(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'nuxt-email-module-'))
  temporaryDirectories.push(directory)
  await mkdir(join(directory, 'app/emails/account'), { recursive: true })
  await writeFile(join(directory, 'app/app.vue'), '<template><div>fixture</div></template>')
  await writeFile(join(directory, 'app/emails/welcome.vue'), '<template><EEmail subject="Welcome" lang="en">Welcome</EEmail></template>')
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => {
    return rm(directory, { force: true, recursive: true })
  }))
})

describe('Nuxt email registry regeneration', () => {
  it.each([
    { baseURL: '/', expectedURL: '/__email' },
    { baseURL: '/dashboard/', expectedURL: '/dashboard/__email' },
  ])('adds a baseURL-aware development preview to Nuxt DevTools', async ({ baseURL, expectedURL }) => {
    const rootDir = await temporaryNuxtDirectory()
    const nuxt = await loadNuxt({
      cwd: workspaceDirectory,
      dev: true,
      overrides: {
        app: { baseURL },
        compatibilityDate: '2025-07-15',
        devtools: { enabled: false },
        modulesDir: [join(workspaceDirectory, 'node_modules')],
        modules: [NuxtEmail],
        rootDir,
      },
      ready: true,
    })

    try {
      const tabs: Array<Record<string, unknown>> = []
      await nuxt.callHook('devtools:customTabs', tabs as never)

      expect(tabs).toContainEqual({
        name: 'nuxt-email',
        title: 'Nuxt Email',
        icon: 'i-lucide-mail',
        view: {
          type: 'iframe',
          src: expectedURL,
        },
      })
    }
    finally {
      await nuxt.close()
    }
  }, 15_000)

  it('does not add the DevTools preview outside development', async () => {
    const rootDir = await temporaryNuxtDirectory()
    const nuxt = await loadNuxt({
      cwd: workspaceDirectory,
      dev: false,
      overrides: {
        compatibilityDate: '2025-07-15',
        devtools: { enabled: false },
        modulesDir: [join(workspaceDirectory, 'node_modules')],
        modules: [NuxtEmail],
        rootDir,
      },
      ready: true,
    })

    try {
      const tabs: Array<Record<string, unknown>> = []
      await nuxt.callHook('devtools:customTabs', tabs as never)
      expect(tabs).toEqual([])
    }
    finally {
      await nuxt.close()
    }
  })

  it('discovers templates from a custom Nuxt srcDir', async () => {
    const rootDir = await temporaryNuxtDirectory()
    const srcDir = join(rootDir, 'custom-source')
    await mkdir(join(srcDir, 'emails'), { recursive: true })
    await writeFile(join(srcDir, 'emails/custom.vue'), '<template><EEmail subject="Custom" lang="en">Custom</EEmail></template>')
    const nuxt = await loadNuxt({
      cwd: workspaceDirectory,
      dev: false,
      overrides: {
        compatibilityDate: '2025-07-15',
        devtools: { enabled: false },
        modulesDir: [join(workspaceDirectory, 'node_modules')],
        modules: [NuxtEmail],
        rootDir,
        srcDir,
      },
      ready: true,
    })

    try {
      const registry = (nuxt.options.nitro as { virtual?: Record<string, unknown> })
        .virtual?.['#nuxt-email/registry']
      expect(registry).toBeTypeOf('function')
      const source = await (registry as () => string | Promise<string>)()
      expect(source).toContain('["custom"]')
      expect(source).not.toContain('["welcome"]')
    }
    finally {
      await nuxt.close()
    }
  }, 15_000)

  it('does not merge email templates from inherited Nuxt layers', async () => {
    const rootDir = await temporaryNuxtDirectory()
    const layerDir = join(rootDir, 'layer')
    await mkdir(join(layerDir, 'app/emails'), { recursive: true })
    await writeFile(join(layerDir, 'nuxt.config.ts'), 'export default defineNuxtConfig({})')
    await writeFile(join(layerDir, 'app/emails/layer-only.vue'), '<template><EEmail subject="Layer" lang="en">Layer</EEmail></template>')
    const nuxt = await loadNuxt({
      cwd: workspaceDirectory,
      dev: false,
      overrides: {
        compatibilityDate: '2025-07-15',
        devtools: { enabled: false },
        extends: [layerDir],
        modulesDir: [join(workspaceDirectory, 'node_modules')],
        modules: [NuxtEmail],
        rootDir,
      },
      ready: true,
    })

    try {
      const registry = (nuxt.options.nitro as { virtual?: Record<string, unknown> })
        .virtual?.['#nuxt-email/registry']
      expect(registry).toBeTypeOf('function')
      const source = await (registry as () => string | Promise<string>)()
      expect(source).toContain('["welcome"]')
      expect(source).not.toContain('["layer-only"]')
    }
    finally {
      await nuxt.close()
    }
  })

  it('installs only the intended server-side authoring surface', async () => {
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

    try {
      const typeOptions = {
        declarations: [],
        nodeReferences: [],
        nodeTsConfig: {},
        references: [],
        sharedReferences: [],
        sharedTsConfig: {},
        tsConfig: {},
      }
      await nuxt.callHook('prepare:types', typeOptions as never)
      const appTsConfig = typeOptions.tsConfig as {
        compilerOptions?: { paths?: Record<string, string[]> }
        exclude?: string[]
        include?: string[]
      }

      // Registered as Nuxt server components, they would open /__nuxt_island/** in production.
      const components: Array<{ filePath: string, pascalName: string }> = []
      await nuxt.callHook('components:dirs', [])
      await nuxt.callHook('components:extend', components as never)
      expect(components.filter(component => component.filePath.replaceAll('\\', '/').includes('/runtime/components/E'))).toEqual([])
      const componentTypes = nuxt.options.build.templates.find(template => template.filename === 'types/nuxt-email-components.d.ts')
      const declaration = await (componentTypes?.getContents as (() => string) | undefined)?.()
      for (const name of EMAIL_TAGS) expect(declaration).toContain(`    ${name}: typeof import(`)

      const nitroOptions = nuxt.options.nitro as {
        alias?: Record<string, string>
        externals?: { inline?: unknown[] }
        typescript?: { tsConfig?: { exclude?: string[], include?: string[] } }
      }
      const nitroAlias = nitroOptions.alias
      expect(nitroAlias?.['@lupinum/nuxt-email/errors']?.replaceAll('\\', '/'))
        .toMatch(/\/runtime\/errors\.(?:js|ts)$/)
      expect(nitroAlias).not.toHaveProperty('#nuxt-email/testing')
      expect(nitroOptions.typescript?.tsConfig?.include).toContain(
        `${join(rootDir, 'app/emails').replaceAll('\\', '/')}/**/*.vue`,
      )
      expect(nitroOptions.typescript?.tsConfig?.exclude).toContain(
        `${join(rootDir, 'app/emails/components').replaceAll('\\', '/')}/**/*.vue`,
      )
      expect(appTsConfig.compilerOptions?.paths?.['#nuxt-email/registry'])
        .toEqual([expect.stringMatching(/types\/nuxt-email\.d\.ts$/)])
      expect(appTsConfig.include).toContain(
        `${join(rootDir, 'app/emails').replaceAll('\\', '/')}/**/*.vue`,
      )
      expect(appTsConfig.exclude).toContain(
        `${join(rootDir, 'app/emails/components').replaceAll('\\', '/')}/**/*.vue`,
      )
      expect(nitroOptions.externals?.inline).toContain(nitroAlias?.['@lupinum/nuxt-email/errors'])
    }
    finally {
      await nuxt.close()
    }
  })

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
      await writeFile(resetPath, '<template><EEmail subject="Reset" lang="en">Reset</EEmail></template>')
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
