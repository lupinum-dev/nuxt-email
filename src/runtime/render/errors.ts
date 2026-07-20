export class EmailRenderError extends Error {
  readonly componentName: string

  constructor(componentName: string, cause: unknown) {
    super(`Failed to render email component ${componentName}`, { cause })
    this.name = 'EmailRenderError'
    this.componentName = componentName
  }
}
