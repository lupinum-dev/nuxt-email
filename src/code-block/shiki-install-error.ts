const SHIKI_PACKAGES = ['@shikijs/core', '@shikijs/engine-javascript', '@shikijs/langs', '@shikijs/themes']

/**
 * The Shiki packages are optional peer dependencies: only an application that sets
 * `codeBlock` installs them. Turn the "module not found" of one of them into an
 * instruction; every other error stays as it is.
 */
export function shikiInstallError(error: unknown): unknown {
  if (!(error instanceof Error) || !('code' in error)) return error
  if (error.code !== 'ERR_MODULE_NOT_FOUND' && error.code !== 'MODULE_NOT_FOUND') return error
  if (!error.message.includes('@shikijs/')) return error
  return new Error(
    `nuxt-email codeBlock needs the Shiki packages, which this package does not install. Add them to your project: ${SHIKI_PACKAGES.join(' ')}`,
    { cause: error },
  )
}
