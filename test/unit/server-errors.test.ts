import { describe, expect, it } from 'vitest'
import {
  DuplicateEmailTemplateError,
  EmailTemplateDiscoveryError,
  UnknownEmailTemplateError,
} from '../../src/runtime/server/errors'

describe('email registry errors', () => {
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

  it('sorts duplicate source paths', () => {
    const error = new DuplicateEmailTemplateError('welcome', ['/z/welcome.vue', '/a/welcome.vue'])

    expect(error.sourcePaths).toEqual(['/a/welcome.vue', '/z/welcome.vue'])
    expect(error.message).toBe('Duplicate email template name "welcome" from: /a/welcome.vue, /z/welcome.vue')
  })

  it('preserves discovery causes', () => {
    const cause = new Error('permission denied')
    const error = new EmailTemplateDiscoveryError('/project/app/emails', cause)

    expect(error.cause).toBe(cause)
    expect(error.sourcePath).toBe('/project/app/emails')
  })
})
