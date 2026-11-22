import { mkdir } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileEmailDirectory } from '../../src/compiler/build-templates'
import type { CreateTestRendererOptions } from '../../src/testing'
import { createTestRenderer } from '../../src/testing'

export const root = fileURLToPath(new URL('../..', import.meta.url))
/** Compiled test templates and bundles; `.tmp` is gitignored. */
export const workDirectory = `${root}.tmp/tests`
export const fixtures = `${root}test/fixtures/render`

/** Compile an email directory with the public test helper. */
export async function buildEmails(
  directory = `${fixtures}/welcome`,
  options: Pick<CreateTestRendererOptions, 'allowUnknownClasses'> = {},
) {
  return await createTestRenderer({ ...options, rootDir: dirname(directory), templatesDir: basename(directory) })
}

/** Bundle an email directory with every package except Vue, to inspect what a production render needs. */
export async function bundleEmails(directory = `${fixtures}/welcome`, label = 'welcome') {
  await mkdir(`${workDirectory}/build`, { recursive: true })
  return await compileEmailDirectory({ directory, outfile: `${workDirectory}/build/${label}.mjs` })
}

export const welcomeProps = {
  firstName: 'Ada',
  activationUrl: 'https://example.com/activate',
  highlighted: true,
}
