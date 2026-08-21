import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { DefineEmailWelcome } from '../fixtures/DefineEmailWelcome'
import type { DefineEmailOptions } from '../../src/runtime/render/define-email'
import {
  defineEmail,
  DefineEmailOutsideRenderError,
  DuplicateEmailDefinitionError,
} from '../../src/runtime/render/define-email'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'

interface SubjectProps {
  firstName: string
}

function subjectEmail(name: string, subject: (props: SubjectProps) => string) {
  return defineComponent({
    name,
    props: { firstName: { type: String, required: true } },
    setup(props: SubjectProps) {
      defineEmail({ subject: () => subject(props) })
      return () => h('html', [h('body', [h('p', `Hi ${props.firstName}`)])])
    },
  })
}

describe('defineEmail metadata registration', () => {
  it('computes the subject from the props passed to the render', async () => {
    const result = await renderEmailComponent(DefineEmailWelcome, { firstName: 'Ada' })

    expect(result.subject).toBe('Welcome aboard, Ada')
    expect(result.html).toContain('Welcome, Ada')
    expect(result.text).toContain('Thanks for signing up.')
  })

  it('omits subject entirely when the template does not call defineEmail', async () => {
    const PlainEmail = defineComponent({
      name: 'PlainEmail',
      setup: () => () => h('html', [h('body', [h('p', 'No subject')])]),
    })

    const result = await renderEmailComponent(PlainEmail)

    expect(result.subject).toBeUndefined()
    expect(Object.hasOwn(result, 'subject')).toBe(false)
    expect(Object.keys(result)).toEqual(['html', 'text'])
  })

  it('accepts constant subject and text metadata', async () => {
    const ConstantMetadataEmail = defineComponent({
      name: 'ConstantMetadataEmail',
      setup() {
        defineEmail({ subject: 'A constant subject', text: 'Authored plain text' })
        return () => h('html', [h('body', [h('p', 'Derived body text')])])
      },
    })

    await expect(renderEmailComponent(ConstantMetadataEmail)).resolves.toEqual({
      html: expect.stringContaining('Derived body text'),
      subject: 'A constant subject',
      text: 'Authored plain text',
    })
  })

  it('uses prop-derived authored text instead of HTML-derived text', async () => {
    const AuthoredTextEmail = defineComponent({
      name: 'AuthoredTextEmail',
      props: { firstName: { type: String, required: true } },
      setup(props: SubjectProps) {
        defineEmail({ text: () => `Plain welcome for ${props.firstName}` })
        return () => h('html', [h('body', [h('p', `Visual welcome for ${props.firstName}`)])])
      },
    })

    const result = await renderEmailComponent(AuthoredTextEmail, { firstName: 'Ada' })
    expect(result.text).toBe('Plain welcome for Ada')
    expect(result.html).toContain('Visual welcome for Ada')
    expect(result.subject).toBeUndefined()
  })

  it('keeps concurrent renders isolated (no shared module state)', async () => {
    const First = subjectEmail('FirstEmail', props => `First: ${props.firstName}`)
    const Second = subjectEmail('SecondEmail', props => `Second: ${props.firstName}`)

    const [first, second] = await Promise.all([
      renderEmailComponent(First, { firstName: 'Ada' }),
      renderEmailComponent(Second, { firstName: 'Grace' }),
    ])

    expect(first.subject).toBe('First: Ada')
    expect(second.subject).toBe('Second: Grace')
  })

  it('keeps interleaved async renders isolated when they resume in reverse order', async () => {
    let releaseFirst!: () => void
    let releaseSecond!: () => void
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })
    const secondGate = new Promise<void>((resolve) => {
      releaseSecond = resolve
    })

    const asyncEmail = (name: string, gate: Promise<void>) => defineComponent({
      name,
      props: { firstName: { type: String, required: true } },
      async setup(props: SubjectProps) {
        await gate
        defineEmail({ subject: () => `${name}: ${props.firstName}` })
        return () => h('html', [h('body', [h('p', props.firstName)])])
      },
    })

    const firstRender = renderEmailComponent(asyncEmail('FirstAsync', firstGate), { firstName: 'Ada' })
    const secondRender = renderEmailComponent(asyncEmail('SecondAsync', secondGate), { firstName: 'Grace' })

    releaseSecond()
    const second = await secondRender
    releaseFirst()
    const first = await firstRender

    expect(first.subject).toBe('FirstAsync: Ada')
    expect(second.subject).toBe('SecondAsync: Grace')
  })

  it('resolves the subject when defineEmail runs after a top-level await in async setup', async () => {
    // Realistic pattern: `const user = await fetchUser(); defineEmail({ subject: ... })`.
    // The standalone renderer carries its metadata context across arbitrary async setup work.
    const AsyncSubjectEmail = defineComponent({
      name: 'AsyncSubjectEmail',
      props: { firstName: { type: String, required: true } },
      async setup(props: SubjectProps) {
        await new Promise(resolve => setTimeout(resolve, 1))
        defineEmail({ subject: () => `Hi ${props.firstName}` })
        return () => h('html', [h('body', [h('p', `Hi ${props.firstName}`)])])
      },
    })

    const result = await renderEmailComponent(AsyncSubjectEmail, { firstName: 'Ada' })

    expect(result.subject).toBe('Hi Ada')
    expect(result.html).toContain('Hi Ada')
  })

  it('restores an outer render context after a nested render', async () => {
    const InnerEmail = subjectEmail('NestedInnerEmail', () => 'Inner subject')
    let innerSubject: string | undefined
    const OuterEmail = defineComponent({
      name: 'NestedOuterEmail',
      async setup() {
        innerSubject = (await renderEmailComponent(InnerEmail, { firstName: 'Inner' })).subject
        defineEmail({ subject: () => 'Outer subject' })
        return () => h('html', [h('body', [h('p', 'Outer body')])])
      },
    })

    const outer = await renderEmailComponent(OuterEmail)

    expect(innerSubject).toBe('Inner subject')
    expect(outer.subject).toBe('Outer subject')
  })

  it('cleans up render context after a failed render', async () => {
    const BrokenEmail = defineComponent({
      name: 'BrokenContextEmail',
      setup() {
        defineEmail({ subject: () => 'Must not leak' })
        throw new Error('setup failed')
      },
    })

    await expect(renderEmailComponent(BrokenEmail)).rejects.toMatchObject({
      cause: { message: 'setup failed' },
    })
    expect(() => defineEmail({ subject: () => 'orphan' }))
      .toThrow(DefineEmailOutsideRenderError)

    const next = await renderEmailComponent(subjectEmail('AfterFailureEmail', () => 'Fresh subject'), {
      firstName: 'Ada',
    })
    expect(next.subject).toBe('Fresh subject')
  })

  it('rejects multiple definitions within one render', async () => {
    const Reassigned = defineComponent({
      name: 'ReassignedEmail',
      setup() {
        defineEmail({ subject: () => 'first' })
        defineEmail({ subject: () => 'second' })
        return () => h('html', [h('body', [h('p', 'body')])])
      },
    })

    const error = await renderEmailComponent(Reassigned).catch(value => value)

    expect(error.cause).toBeInstanceOf(DuplicateEmailDefinitionError)
  })

  it('throws a typed error when called outside an email render', () => {
    expect(() => defineEmail({ subject: () => 'orphan' }))
      .toThrow(DefineEmailOutsideRenderError)
  })

  it('rejects a non-string subject returned by untyped JavaScript', async () => {
    const InvalidSubject = defineComponent({
      name: 'InvalidSubjectEmail',
      setup() {
        defineEmail({ subject: (() => 42) as unknown as () => string })
        return () => h('html', [h('body', [h('p', 'body')])])
      },
    })

    const error = await renderEmailComponent(InvalidSubject).catch(value => value)

    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toBe('defineEmail() subject must return a string; received number')
  })

  it('rejects an undefined subject returned by untyped JavaScript', async () => {
    const InvalidSubject = defineComponent({
      name: 'UndefinedSubjectEmail',
      setup() {
        defineEmail({ subject: (() => undefined) as unknown as () => string })
        return () => h('html', [h('body', [h('p', 'body')])])
      },
    })

    const error = await renderEmailComponent(InvalidSubject).catch(value => value)

    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toBe('defineEmail() subject must return a string; received undefined')
  })

  it('rejects non-string authored text returned by untyped JavaScript', async () => {
    const InvalidText = defineComponent({
      name: 'InvalidTextEmail',
      setup() {
        defineEmail({ text: (() => 42) as unknown as () => string })
        return () => h('html', [h('body', [h('p', 'body')])])
      },
    })

    const error = await renderEmailComponent(InvalidText).catch(value => value)
    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toBe('defineEmail() text must return a string; received number')
  })

  it('rejects empty metadata from untyped JavaScript', async () => {
    const EmptyDefinition = defineComponent({
      name: 'EmptyDefinitionEmail',
      setup() {
        defineEmail({} as DefineEmailOptions)
        return () => h('html', [h('body')])
      },
    })

    const error = await renderEmailComponent(EmptyDefinition).catch(value => value)
    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toBe('defineEmail() requires subject or text metadata.')
  })

  it('rejects a malformed subject declaration from untyped JavaScript', async () => {
    const InvalidDefinition = defineComponent({
      name: 'InvalidDefinitionEmail',
      setup() {
        defineEmail({ subject: null } as unknown as DefineEmailOptions)
        return () => h('html', [h('body', [h('p', 'body')])])
      },
    })

    const error = await renderEmailComponent(InvalidDefinition).catch(value => value)

    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toBe('defineEmail() subject must be a string or a function returning a string.')
  })
})
