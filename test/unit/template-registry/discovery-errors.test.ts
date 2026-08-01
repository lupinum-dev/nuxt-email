import { describe, expect, it } from 'vitest'
import {
  DuplicateEmailTemplateError,
  EmailTemplateDiscoveryError,
} from '../../../src/template-registry/discovery-errors'

describe('email template discovery errors', () => {
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
