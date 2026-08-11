import { describe, expect, it } from 'vitest'
import { UnknownEmailTemplateError } from '../../../src/runtime/errors'

describe('email template registry errors', () => {
  it('sorts known template names for an actionable unknown-name error', () => {
    const error = new UnknownEmailTemplateError('missing', ['welcome', 'account/reset'])

    expect(error.name).toBe('UnknownEmailTemplateError')
    expect(error.requestedName).toBe('missing')
    expect(error.knownNames).toEqual(['account/reset', 'welcome'])
    expect(error.message).toBe('Unknown email template "missing"; known templates: account/reset, welcome')
  })

  it('reports an empty registry explicitly', () => {
    expect(new UnknownEmailTemplateError('missing', []).message)
      .toBe('Unknown email template "missing"; no email templates are registered')
  })
})
