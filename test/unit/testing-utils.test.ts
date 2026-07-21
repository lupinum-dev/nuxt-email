import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { defineEmail } from '../../src/runtime/render/define-email'
import { normalizeEmailHtml, renderEmailComponent } from '../../src/runtime/testing'

describe('@lupinum/nuxt-email/testing: normalizeEmailHtml', () => {
  it('strips React boundary markers while preserving meaningful comments', () => {
    const input = '<!--$--><p>Safe</p><!--/$--><!--meaningful-->'
    expect(normalizeEmailHtml(input)).toBe('<p>Safe</p><!--meaningful-->')
  })

  it('sorts attributes, lowercases cellPadding/cellSpacing, and drops trailing style semicolons', () => {
    const input = '<img style="color:red;" width="10" cellPadding="0" cellSpacing="0" alt="Logo">'
    expect(normalizeEmailHtml(input)).toBe(
      '<img alt="Logo" cellpadding="0" cellspacing="0" style="color:red" width="10">',
    )
  })

  it('trims and collapses class whitespace', () => {
    expect(normalizeEmailHtml('<span class="a   b  c">x</span>')).toBe('<span class="a b c">x</span>')
  })

  it('renders two structurally equivalent documents equal despite attribute order', () => {
    const a = '<td align="center" style="padding:0">x</td>'
    const b = '<td style="padding:0;" align="center">x</td>'
    expect(normalizeEmailHtml(a)).toBe(normalizeEmailHtml(b))
  })
})

describe('@lupinum/nuxt-email/testing: renderEmailComponent', () => {
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
