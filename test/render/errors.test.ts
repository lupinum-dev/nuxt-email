import { beforeAll, describe, expect, it } from 'vitest'
import { EmailRenderError } from '../../src/runtime/render/errors'
import { UnknownEmailTemplateError } from '../../src/runtime/template-registry/errors'
import { buildEmails, fixtures } from './build'

let renderEmail: Awaited<ReturnType<typeof buildEmails>>['renderEmail']

beforeAll(async () => {
  renderEmail = (await buildEmails(`${fixtures}/errors`)).renderEmail
})

describe('renderEmail errors', () => {
  it('throws UnknownEmailTemplateError directly for an unknown name', async () => {
    const error = await renderEmail('missing').catch((value: unknown) => value)
    expect(error).toBeInstanceOf(UnknownEmailTemplateError)
    expect((error as Error).message).toBe(
      'Unknown email template "missing"; known templates: async-failure, greeting, no-email, two-emails, wrapped-email',
    )
  })

  // The registry is a plain object: inherited names must not count as templates.
  it.each(['constructor', '__proto__', 'toString'])('treats %s as an unknown template', async (name) => {
    await expect(renderEmail(name)).rejects.toBeInstanceOf(UnknownEmailTemplateError)
  })

  it.each([
    ['unknown prop', 'greeting', { name: 'Ada', extra: true }, TypeError, 'Unknown email component prop: extra'],
    ['missing required prop', 'greeting', {}, TypeError, 'Missing required email component prop: name'],
    ['required prop set to undefined', 'greeting', { name: undefined }, TypeError, 'Missing required email component prop: name'],
    ['null props', 'greeting', null, TypeError, 'Email props must be an object; received null'],
    ['string props', 'greeting', 'Ada', TypeError, 'Email props must be an object; received string'],
    ['array props', 'greeting', ['Ada'], TypeError, 'Email props must be an object; received an array'],
    ['no EEmail', 'no-email', {}, TypeError, 'An email template must use EEmail as its root.'],
    ['EEmail not at the root', 'wrapped-email', {}, TypeError, 'EEmail must be the root of the email template, with nothing around it.'],
    ['two EEmail', 'two-emails', {}, TypeError, 'An email template must render exactly one EEmail.'],
    ['throw after await in script setup', 'async-failure', {}, Error, 'Order lookup failed'],
  ])('%s', async (_case, name, props, causeType, causeMessage) => {
    const error = await renderEmail(name, props as Record<string, unknown>).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(EmailRenderError)
    expect(error).toMatchObject({ message: `Failed to render email template ${name}`, templateName: name })
    const cause = (error as EmailRenderError).cause
    expect(cause).toBeInstanceOf(causeType)
    expect((cause as Error).message).toBe(causeMessage)
    expect(cause).not.toBeInstanceOf(EmailRenderError)
  })
})
