import { createRequire } from 'node:module'

const SHIKI_PACKAGES = ['@shikijs/core', '@shikijs/engine-javascript', '@shikijs/langs', '@shikijs/themes']

const requireFromPackage = createRequire(import.meta.url)

/**
 * The Shiki packages are optional peer dependencies: only an application that sets
 * `codeBlock` installs them. Check all four before anything imports one, so a missing
 * package gives an instruction instead of an unresolved import later in the build.
 *
 * @param resolve Resolves a package from this package's location; a parameter for tests.
 */
export function assertShikiInstalled(resolve: (name: string) => unknown = name => requireFromPackage.resolve(name)): void {
  const missing = SHIKI_PACKAGES.filter((name) => {
    try {
      resolve(name)
      return false
    }
    catch {
      return true
    }
  })
  if (missing.length === 0) return
  throw new Error(
    `nuxt-email codeBlock needs the Shiki packages, which this package does not install. Missing: ${missing.join(', ')}. `
    + `Add all four to your project: ${SHIKI_PACKAGES.join(' ')}`,
  )
}
