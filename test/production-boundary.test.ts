import { execFile } from 'node:child_process'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { promisify } from 'node:util'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { buildNuxt, loadNuxt } from '@nuxt/kit'
import { describe, expect, it } from 'vitest'

interface CapturedModule {
  id: string
}

interface VitePluginContainer {
  plugins?: unknown[]
}

interface BuildResult {
  buildDir: string
  clientModuleIds: string[]
  outputDir: string
  temporaryDirectory: string
}

const basicFixture = fileURLToPath(new URL('./fixtures/basic', import.meta.url))
const clientImportFixture = fileURLToPath(new URL('./fixtures/client-import', import.meta.url))
const executeFile = promisify(execFile)

async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? collectFiles(path) : [path]
  }))

  return files.flat().sort()
}

async function buildFixture(rootDir: string, captureClientModules = false): Promise<BuildResult> {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'nuxt-email-production-boundary-'))
  const buildDir = join(temporaryDirectory, '.nuxt')
  const outputDir = join(temporaryDirectory, '.output')
  const clientModuleIds = new Set<string>()
  const overrides = {
    buildDir,
    devtools: { enabled: false },
    nitro: {
      output: { dir: outputDir },
    },
    telemetry: false,
    vite: {
      cacheDir: join(temporaryDirectory, 'vite-cache'),
    },
  }
  const nuxt = await loadNuxt({
    cwd: rootDir,
    dev: false,
    overrides,
  })

  if (captureClientModules) {
    nuxt.hook('vite:extendConfig', (config, { isClient }) => {
      if (!isClient) {
        return
      }

      const mutableConfig = config as VitePluginContainer
      mutableConfig.plugins ??= []
      mutableConfig.plugins.push({
        name: 'nuxt-email:test-client-module-audit',
        moduleParsed(module: CapturedModule) {
          clientModuleIds.add(module.id.replaceAll('\\', '/'))
        },
      })
    })
  }

  try {
    await buildNuxt(nuxt)
  }
  catch (error) {
    await nuxt.close()
    await rm(temporaryDirectory, { recursive: true, force: true })
    throw error
  }
  await nuxt.close()

  return {
    buildDir,
    clientModuleIds: [...clientModuleIds].sort(),
    outputDir,
    temporaryDirectory,
  }
}

describe('production server boundary', () => {
  it('keeps the canonical renderer and discovered templates out of the client build', { timeout: 120_000 }, async () => {
    const result = await buildFixture(basicFixture, true)

    try {
      const declarationFiles = (await collectFiles(result.buildDir))
        .filter(path => path.endsWith('.d.ts'))
      const declarationsWithRenderEmail = (
        await Promise.all(declarationFiles.map(async path => ({
          contents: await readFile(path, 'utf8'),
          path: relative(result.buildDir, path).replaceAll('\\', '/'),
        })))
      )
        .filter(file => file.contents.includes('renderEmail'))
        .map(file => file.path)
        .sort()

      expect(declarationsWithRenderEmail).toEqual([
        'types/nitro-imports.d.ts',
        'types/nuxt-email.d.ts',
      ])

      const nitroImports = await readFile(join(result.buildDir, 'types/nitro-imports.d.ts'), 'utf8')
      const nitroNuxtTypes = await readFile(join(result.buildDir, 'types/nitro-nuxt.d.ts'), 'utf8')
      const emailTypes = await readFile(join(result.buildDir, 'types/nuxt-email.d.ts'), 'utf8')

      expect(nitroImports).toContain('export { renderEmail } from \'#nuxt-email/registry\'')
      expect(nitroNuxtTypes).toContain('reference path="nuxt-email.d.ts"')
      expect(emailTypes).toContain('export function renderEmail<Name extends EmailTemplateName>')

      expect(result.clientModuleIds.length).toBeGreaterThan(0)
      expect(result.clientModuleIds.filter(id => (
        id.includes('/app/emails/')
        || id.includes('/src/runtime/render/')
        || id.includes('/src/runtime/server/')
        || id.includes('/html-to-text/')
        || id.includes('/@vue/server-renderer/')
        || id.includes('/@vue+server-renderer@')
      ))).toEqual([])

      const clientFiles = (await collectFiles(join(result.outputDir, 'public')))
        .filter(path => /\.(?:css|html|js|json|mjs)$/.test(path))
      const clientOutput = (
        await Promise.all(clientFiles.map(path => readFile(path, 'utf8')))
      ).join('\n')

      expect(clientOutput).not.toContain('NUXT_EMAIL_SERVER_ONLY_TEMPLATE_7F4C')
      expect(clientOutput).not.toContain('/app/emails/')
      expect(clientOutput).not.toContain('/src/runtime/render/')
      expect(clientOutput).not.toContain('html-to-text')

      const serverFiles = (await collectFiles(join(result.outputDir, 'server')))
        .filter(path => /\.(?:js|json|map|mjs)$/.test(path))
      const serverOutput = (
        await Promise.all(serverFiles.map(path => readFile(path, 'utf8')))
      ).join('\n')

      expect(serverOutput).toContain('NUXT_EMAIL_SERVER_ONLY_TEMPLATE_7F4C')
      expect(serverOutput).toContain('html-to-text')

      const routeDirectory = join(result.outputDir, 'server/chunks/routes/api')
      const routeUrls = [
        'render-transactional.get.mjs',
        'render-reset.get.mjs',
        'render-unknown.get.mjs',
      ].map(filename => pathToFileURL(join(routeDirectory, filename)).href)
      const { stdout } = await executeFile(process.execPath, [
        '--input-type=module',
        '--eval',
        `const routes = await Promise.all(${JSON.stringify(routeUrls)}.map(url => import(url))); console.log(JSON.stringify(await Promise.all(routes.map(route => route.default()))))`,
      ], {
        env: { ...process.env, NODE_ENV: 'production' },
      })
      const [rendered, reset, unknown] = JSON.parse(stdout) as [
        { html: string, text: string },
        { html: string, text: string },
        { knownNames: string[], name: string, requestedName: string },
      ]

      expect(rendered.html).toContain('NUXT_EMAIL_SERVER_ONLY_TEMPLATE_7F4C')
      expect(rendered.html).toContain('Welcome, Ada')
      expect(rendered.text).toContain('Activate account https://example.com/activate?token=fixture&source=email')
      expect(reset.text).toContain('Use code VUE-2048 within 15 minutes.')
      expect(unknown).toMatchObject({
        knownNames: ['account/reset-password', 'transactional'],
        name: 'UnknownEmailTemplateError',
        requestedName: 'not-registered',
      })
    }
    finally {
      await rm(result.temporaryDirectory, { recursive: true, force: true })
    }
  })

  it('fails clearly when application code imports renderEmail', { timeout: 120_000 }, async () => {
    await expect(buildFixture(clientImportFixture)).rejects.toThrow(/failed to find "renderEmail" imported from "#imports"/i)
  })
})
