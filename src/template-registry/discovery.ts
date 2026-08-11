import { isAbsolute, relative, sep } from 'node:path'
import { resolveFiles } from '@nuxt/kit'
import {
  DuplicateEmailTemplateError,
  EmailTemplateDiscoveryError,
} from './discovery-errors'

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
  const templates = sourcePaths.map((sourcePath) => {
    const relativePath = normalizeSeparators(relative(emailDirectory, sourcePath))
    if (relativePath.startsWith('../') || relativePath === '..' || isAbsolute(relativePath)) {
      throw new EmailTemplateDiscoveryError(sourcePath, new TypeError('Template path is outside app/emails'))
    }

    return {
      name: relativePath.slice(0, -'.vue'.length),
      sourcePath: normalizeSeparators(sourcePath),
    }
  }).sort((left, right) => {
    return compareCodePoints(left.name, right.name) || compareCodePoints(left.sourcePath, right.sourcePath)
  })

  const pathsByName = new Map<string, string[]>()
  for (const template of templates) {
    const paths = pathsByName.get(template.name) ?? []
    paths.push(template.sourcePath)
    pathsByName.set(template.name, paths)
  }

  const duplicate = [...pathsByName.entries()]
    .filter(([, paths]) => paths.length > 1)
    .sort(([left], [right]) => compareCodePoints(left, right))[0]
  if (duplicate) {
    throw new DuplicateEmailTemplateError(duplicate[0], duplicate[1])
  }

  return templates
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
