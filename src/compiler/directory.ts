import { dirname, isAbsolute, relative, resolve } from 'node:path'

export function contains(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (!path.startsWith('..') && !isAbsolute(path))
}

/** The absolute root and email directory; `templatesDir` must stay inside `rootDir`. */
export function resolveEmailDirectory(rootDir: string, templatesDir = 'app/emails'): { rootDir: string, directory: string } {
  const root = resolve(rootDir)
  if (isAbsolute(templatesDir)) throw new TypeError('templatesDir must be relative to rootDir.')
  const directory = resolve(root, templatesDir)
  if (!contains(root, directory)) throw new TypeError('templatesDir must remain inside rootDir.')
  return { rootDir: root, directory }
}

/**
 * Nuxt's default import aliases for an email directory, so templates that import
 * `~/components/x.vue` compile without loading the Nuxt configuration. `~` and `@` are
 * the `srcDir`, the parent of the email directory (`app/` for `app/emails`).
 */
export function defaultNuxtAlias(rootDir: string, directory: string): Record<string, string> {
  const srcDir = dirname(directory)
  return { '~': srcDir, '@': srcDir, '~~': rootDir, '@@': rootDir }
}
