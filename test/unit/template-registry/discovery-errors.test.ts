import { describe, expect, it } from 'vitest'
import { EmailTemplateDiscoveryError } from '../../../src/template-registry/discovery-errors'

describe('email template discovery errors', () => {
  it('preserves discovery causes', () => {
    const cause = new Error('permission denied')
    const error = new EmailTemplateDiscoveryError('/project/app/emails', cause)

    expect(error.cause).toBe(cause)
    expect(error.sourcePath).toBe('/project/app/emails')
  })
})
