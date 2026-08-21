export class EmailRenderError extends Error {
  readonly templateName: string

  constructor(templateName: string, cause: unknown) {
    super(`Failed to render email template ${templateName}`, { cause })
    this.name = 'EmailRenderError'
    this.templateName = templateName
  }
}
