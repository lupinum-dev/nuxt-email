import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { buildPrismModuleSource } from '../../../scripts/vendor-prism'

/**
 * The "prism:vendor-check": asserts the vendored Prism grammar registry in
 * src/runtime/components/code-block-prism.ts is byte-for-byte reproducible from
 * the installed `prismjs` package (regenerate with
 * `node --import tsx scripts/vendor-prism.ts`). Same reproducibility discipline
 * as `oracle:check` and the Tailwind stylesheet guard.
 *
 * It also guards the release blocker this file exists to fix: the vendored
 * module must contain NO runtime-dynamic module loading, so it bundles into a
 * static Nitro chunk instead of resolving `prismjs` from the virtual
 * `file:///_entry.js` entry at render time.
 */
const require = createRequire(import.meta.url)
const scriptDir = dirname(fileURLToPath(import.meta.url))
const vendoredPath = join(scriptDir, '../../../src/runtime/components/code-block-prism.ts')
const vendored = readFileSync(vendoredPath, 'utf8')

describe('vendored prism grammar registry', () => {
  it('matches scripts/vendor-prism.ts output byte-for-byte', () => {
    expect(vendored).toBe(buildPrismModuleSource())
  })

  it('is vendored from the pinned prismjs@1.30.0', () => {
    const prismPkgRoot = dirname(require.resolve('prismjs/package.json'))
    const pkg = JSON.parse(
      readFileSync(join(prismPkgRoot, 'package.json'), 'utf8'),
    ) as { version: string }
    expect(pkg.version).toBe('1.30.0')
  })

  it('contains no runtime-dynamic module loading', () => {
    // The whole point of vendoring: statically import prismjs, never resolve it
    // at runtime. `createRequire` from a bundled chunk resolves from the virtual
    // `file:///_entry.js`, which cannot find `prismjs` and hangs the release probe.
    expect(vendored).not.toMatch(/createRequire\s*\(/)
    expect(vendored).not.toContain('node:module')
    expect(vendored).not.toMatch(/\brequire\(\s*['"]prism/)
    // The single dependency edge is a static ESM import of the pinned package.
    expect(vendored).toContain('import * as PrismImport from \'prismjs\'')
  })
})
