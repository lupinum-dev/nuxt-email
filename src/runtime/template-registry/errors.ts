export class UnknownEmailTemplateError extends Error {
  readonly requestedName: string
  readonly knownNames: readonly string[]

  constructor(requestedName: string, knownNames: readonly string[]) {
    const sortedKnownNames = [...knownNames].sort()
    super(sortedKnownNames.length === 0
      ? `Unknown email template "${requestedName}"; no email templates are registered`
      : `Unknown email template "${requestedName}"; known templates: ${sortedKnownNames.join(', ')}`)
    this.name = 'UnknownEmailTemplateError'
    this.requestedName = requestedName
    this.knownNames = sortedKnownNames
  }
}
