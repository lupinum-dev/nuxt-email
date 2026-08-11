export class DuplicateEmailTemplateError extends Error {
  readonly templateName: string
  readonly sourcePaths: readonly string[]

  constructor(templateName: string, sourcePaths: readonly string[]) {
    const sortedSourcePaths = [...sourcePaths].sort()
    super(`Duplicate email template name "${templateName}" from: ${sortedSourcePaths.join(', ')}`)
    this.name = 'DuplicateEmailTemplateError'
    this.templateName = templateName
    this.sourcePaths = sortedSourcePaths
  }
}

export class EmailTemplateDiscoveryError extends Error {
  readonly sourcePath: string

  constructor(sourcePath: string, cause: unknown) {
    super(`Failed to discover email templates under ${sourcePath}`, { cause })
    this.name = 'EmailTemplateDiscoveryError'
    this.sourcePath = sourcePath
  }
}
