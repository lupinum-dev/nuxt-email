import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EmailRenderError as PublicEmailRenderError } from '../../src/runtime/errors'
import { defineEmail } from '../../src/runtime/render/define-email'
import {
  EmailRenderError as TestingEmailRenderError,
  renderEmailComponent,
} from '../../src/runtime/testing'

describe('@lupinum/nuxt-email/testing: renderEmailComponent', () => {
  it('re-exports the one public EmailRenderError identity', () => {
    expect(TestingEmailRenderError).toBe(PublicEmailRenderError)
  })

  it('renders a real component to a complete email document without a Nuxt app', async () => {
    const Email = defineComponent({
      name: 'HelloEmail',
      setup: () => () => h('html', [h('body', [h('p', 'Hello world')])]),
    })

    const result = await renderEmailComponent(Email)

    expect(result.html).toContain('<!DOCTYPE html')
    expect(result.html).toContain('<p>Hello world</p>')
    expect(result.text).toBe('Hello world')
    expect(result).not.toHaveProperty('subject')
  })

  it('passes props through to the rendered output', async () => {
    const Email = defineComponent({
      name: 'GreetingEmail',
      props: { name: { type: String, required: true } },
      setup: props => () => h('html', [h('body', [h('p', `Hi ${props.name}`)])]),
    })

    const result = await renderEmailComponent(Email, { name: 'Ada' })

    expect(result.text).toBe('Hi Ada')
  })

  it('surfaces a subject declared through the portable explicit helper', async () => {
    const Email = defineComponent({
      name: 'SubjectEmail',
      props: { name: { type: String, required: true } },
      setup(props) {
        defineEmail({ subject: () => `Welcome, ${props.name}` })
        return () => h('html', [h('body', [h('p', `Hi ${props.name}`)])])
      },
    })

    const result = await renderEmailComponent(Email, { name: 'Ada' })

    expect(result.subject).toBe('Welcome, Ada')
  })

  it('does not create or replace a defineEmail global', async () => {
    const before = Object.getOwnPropertyDescriptor(globalThis, 'defineEmail')
    const Email = defineComponent({
      name: 'NoGlobalEmail',
      setup: () => () => h('html', [h('body', 'Safe')]),
    })

    await renderEmailComponent(Email)

    expect(Object.getOwnPropertyDescriptor(globalThis, 'defineEmail')).toEqual(before)
  })
})
