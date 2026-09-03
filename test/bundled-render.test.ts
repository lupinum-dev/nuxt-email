import { execFile } from 'node:child_process'
import { cp, mkdtemp, realpath, rm } from 'node:fs/promises'
import { isBuiltin } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { build, type Plugin } from 'esbuild'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildEmailRegistry } from '../src/build'

const execute = promisify(execFile)
const root = fileURLToPath(new URL('..', import.meta.url))

describe('bundled Node production rendering without package files', () => {
  let project: string
  let isolated: string
  let registry: string

  beforeAll(async () => {
    // Only declaration compilation needs project dependencies. The final child
    // executes elsewhere and can read only the single emitted bundle.
    project = await mkdtemp(join(root, '.bundled-render-test-'))
    isolated = await mkdtemp(join(await realpath(tmpdir()), 'nuxt-email-bundled-render-'))
    await cp(join(root, 'test/fixtures/standalone/emails'), join(project, 'app/emails'), { recursive: true })
    const outDir = join(project, 'generated')
    await buildEmailRegistry({ rootDir: project, outDir })
    registry = join(outDir, 'index.mjs')
  }, 60_000)

  afterAll(async () => {
    if (project) await rm(project, { recursive: true, force: true })
    if (isolated) await rm(isolated, { recursive: true, force: true })
  })

  async function bundle(filename: string, plugins: Plugin[] = []) {
    const outfile = join(isolated, filename)
    const result = await build({
      absWorkingDir: root,
      stdin: {
        resolveDir: root,
        sourcefile: 'bundled-render-consumer.mjs',
        contents: `
import assert from 'node:assert/strict'
import { renderEmail } from ${JSON.stringify(registry)}
const rendered = await Promise.all(['First', 'Second'].map(name => renderEmail('welcome', {
  name, destination: 'https://example.test/account?a=1&b=2',
  items: ['Bundled Tailwind output'], brand: 'blue',
})))
for (const [index, email] of rendered.entries()) {
  assert.equal(email.subject, 'Welcome, ' + ['First', 'Second'][index])
  assert.match(email.html, /font-weight:700/)
  assert.match(email.html, /blue team/)
  assert.match(email.text, /Bundled Tailwind output/)
  assert.match(email.text, /https:\\/\\/example.test\\/account\\?a=1&b=2/)
}
assert.match((await renderEmail('plain-email', {})).text, /A template without a script/)
process.stdout.write('bundled rendering passed')
`,
      },
      outfile,
      bundle: true,
      packages: 'bundle',
      platform: 'node',
      format: 'esm',
      target: 'node22',
      // Match Node bundlers that support CommonJS dependencies inside ESM.
      banner: { js: `import { createRequire as createBundleRequire } from 'node:module'; const require = createBundleRequire(import.meta.url);` },
      alias: {
        '@lupinum/nuxt-email/render': resolve(root, 'src/runtime/render/index.ts'),
        '@lupinum/nuxt-email/define-email': resolve(root, 'src/runtime/define-email.ts'),
      },
      metafile: true,
      plugins,
      logLevel: 'silent',
    })
    expect(Object.values(result.metafile.outputs).flatMap(output => output.imports)
      .filter(dependency => dependency.external && !isBuiltin(dependency.path))).toEqual([])
    return outfile
  }

  const runIsolated = (outfile: string) => execute(process.execPath, [
    '--permission', `--allow-fs-read=${outfile}`, outfile,
  ], { cwd: isolated, env: { ...process.env, NODE_PATH: '' } })

  it('reproduces the root-import failure and renders with the granular public entries', async () => {
    const baseline = await bundle('baseline.mjs', [{
      name: 'restore-before-fix-root-import',
      setup(builder) {
        builder.onLoad({ filter: /runtime\/tailwind\/css-tree\.ts$/ }, () => ({
          contents: `export { parse, generate, walk, find, clone, List, string } from 'css-tree'`,
          loader: 'js',
        }))
      },
    }])
    await expect(runIsolated(baseline)).rejects.toMatchObject({
      stderr: expect.stringMatching(/patch\.json/),
    })

    const fixed = await bundle('fixed.mjs')
    const result = await runIsolated(fixed)
    expect(result.stdout).toBe('bundled rendering passed')
  }, 60_000)
})
