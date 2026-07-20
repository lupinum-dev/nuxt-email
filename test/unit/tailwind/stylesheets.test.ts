import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  indexCss,
  preflightCss,
  themeCss,
  utilitiesCss,
} from '../../../src/runtime/tailwind/engine/stylesheets'

/**
 * The "tailwind:vendor-check": asserts the vendored stylesheet strings in
 * src/runtime/tailwind/engine/stylesheets.ts are byte-for-byte identical to the
 * installed `tailwindcss` package (regenerate with
 * `node --import tsx scripts/vendor-tailwind-css.ts`). Same reproducibility
 * discipline as `oracle:check`.
 */
const require = createRequire(import.meta.url)
const tailwindPkgRoot = dirname(require.resolve('tailwindcss/package.json'))

const CASES = [
  ['index.css', indexCss],
  ['preflight.css', preflightCss],
  ['theme.css', themeCss],
  ['utilities.css', utilitiesCss],
] as const

describe('vendored tailwind stylesheets', () => {
  it.each(CASES)(
    'matches node_modules/tailwindcss/%s byte-for-byte',
    (file, vendored) => {
      const onDisk = readFileSync(join(tailwindPkgRoot, file), 'utf8')
      expect(vendored).toBe(onDisk)
    },
  )

  it('is vendored from the pinned tailwindcss@4.1.18', () => {
    const pkg = JSON.parse(
      readFileSync(join(tailwindPkgRoot, 'package.json'), 'utf8'),
    ) as { version: string }
    expect(pkg.version).toBe('4.1.18')
  })
})
