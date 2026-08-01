import { stat } from 'node:fs/promises'
import type { DiscoveredEmailTemplate } from './template-registry/discovery'

export function previewFixturePath(sourcePath: string): string {
  return `${sourcePath.slice(0, -'.vue'.length)}.fixtures.ts`
}

async function existingPreviewFixturePath(sourcePath: string): Promise<string | undefined> {
  const fixturePath = previewFixturePath(sourcePath)

  try {
    const fixture = await stat(fixturePath)
    return fixture.isFile() ? fixturePath : undefined
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return undefined
    }

    throw new Error(`Failed to inspect preview fixture ${fixturePath}`, { cause: error })
  }
}

export async function attachPreviewFixtures(
  templates: readonly DiscoveredEmailTemplate[],
): Promise<DiscoveredEmailTemplate[]> {
  return Promise.all(templates.map(async (template) => {
    const fixturePath = await existingPreviewFixturePath(template.sourcePath)

    return fixturePath
      ? { ...template, fixturePath }
      : { ...template }
  }))
}
