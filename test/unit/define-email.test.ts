import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { DefineEmailWelcome } from '../fixtures/DefineEmailWelcome'
import { defineEmail, DefineEmailOutsideRenderError } from '../../src/runtime/render/define-email'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'

interface SubjectProps {
  firstName: string
}

function subjectEmail(name: string, subject: (props: SubjectProps) => string): ReturnType<typeof defineComponent> {
  return defineComponent({
    name,
    props: { firstName: { type: String, required: true } },
    setup(props: SubjectProps) {
      defineEmail<SubjectProps>({ subject })
      return () => h('html', [h('body', [h('p', `Hi ${props.firstName}`)])])
    },
  })
}

describe('defineEmail subject registration', () => {
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

  it('lets a later defineEmail call win within a single render', async () => {
    const Reassigned = defineComponent({
      name: 'ReassignedEmail',
      setup() {
        defineEmail({ subject: () => 'first' })
        defineEmail({ subject: () => 'second' })
        return () => h('html', [h('body', [h('p', 'body')])])
      },
    })

    const result = await renderEmailComponent(Reassigned)

    expect(result.subject).toBe('second')
  })

  it('throws a typed error when called outside an email render', () => {
    expect(() => defineEmail({ subject: () => 'orphan' }))
      .toThrow(DefineEmailOutsideRenderError)
  })
})
