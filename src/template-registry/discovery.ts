import { isAbsolute, relative, sep } from 'node:path'
import { resolveFiles } from '@nuxt/kit'
import { EmailTemplateDiscoveryError } from './discovery-errors'

export interface DiscoveredEmailTemplate {
  name: string
  sourcePath: string
  fixturePath?: string
}

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function normalizeSeparators(value: string): string {
  return value.split(sep).join('/').replaceAll('\\', '/')
}

export function templatesFromSourcePaths(
  emailDirectory: string,
  sourcePaths: readonly string[],
): DiscoveredEmailTemplate[] {
  // A name is the path relative to the email directory, so two files cannot share one.
  return sourcePaths.map((sourcePath) => {
    const relativePath = normalizeSeparators(relative(emailDirectory, sourcePath))
    if (relativePath.startsWith('../') || relativePath === '..' || isAbsolute(relativePath)) {
      throw new EmailTemplateDiscoveryError(sourcePath, new TypeError('Template path is outside app/emails'))
    }

    return {
      name: relativePath.slice(0, -'.vue'.length),
      sourcePath: normalizeSeparators(sourcePath),
    }
  }).sort((left, right) => compareCodePoints(left.name, right.name))
}

export async function discoverEmailTemplates(emailDirectory: string): Promise<DiscoveredEmailTemplate[]> {
  let sourcePaths: string[]
  try {
    sourcePaths = await resolveFiles(emailDirectory, '**/*.vue', {
      followSymbolicLinks: false,
      ignore: ['components/**'],
    })
  }
  catch (error) {
    throw new EmailTemplateDiscoveryError(emailDirectory, error)
  }

  return templatesFromSourcePaths(emailDirectory, sourcePaths)
}
