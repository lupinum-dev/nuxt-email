export class EmailTemplateDiscoveryError extends Error {
  readonly sourcePath: string

  constructor(sourcePath: string, cause: unknown) {
    super(`Failed to discover email templates under ${sourcePath}`, { cause })
    this.name = 'EmailTemplateDiscoveryError'
    this.sourcePath = sourcePath
  }
}
