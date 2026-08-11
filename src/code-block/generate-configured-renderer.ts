export interface ConfiguredRendererRuntimePaths {
  codeBlockComponent: string
  createRenderEmailComponent: string
  emailComponentRegistry: string
  emailRenderError: string
}

function importPath(path: string): string {
  return JSON.stringify(path.replaceAll('\\', '/'))
}

export function generateConfiguredRenderer(
  runtimePaths: ConfiguredRendererRuntimePaths,
): string {
  return `import { emailComponentRegistry } from ${importPath(runtimePaths.emailComponentRegistry)}
import { createRenderEmailComponent } from ${importPath(runtimePaths.createRenderEmailComponent)}
import { ECodeBlock } from ${importPath(runtimePaths.codeBlockComponent.replace(/\.ts$/, ''))}
export { EmailRenderError } from ${importPath(runtimePaths.emailRenderError)}

const configuredEmailComponents = Object.freeze({ ...emailComponentRegistry, ECodeBlock })

export const renderEmailComponent = createRenderEmailComponent(configuredEmailComponents)
`
}

export function generateConfiguredRendererTypes(
  testingPath: string,
): string {
  return `export { EmailRenderError, renderEmailComponent } from ${importPath(testingPath)}
export type { RenderedEmail } from ${importPath(testingPath)}
`
}
