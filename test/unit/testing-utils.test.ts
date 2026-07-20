import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { normalizeEmailHtml, renderEmailComponent } from '../../src/runtime/testing'

describe('nuxt-email/testing: normalizeEmailHtml', () => {
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

describe('nuxt-email/testing: renderEmailComponent', () => {
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

  it('surfaces a subject declared via a bare (auto-imported) defineEmail call', async () => {
    // `defineEmail` is a Nuxt auto-import, so the Vue SFC compiler emits it as a
    // bare identifier and the compiled `setup()` resolves it off globalThis when
    // rendered outside Nuxt (the documented plain-Vitest workflow). `new Function`
    // gives the setup the same free-global resolution without a lexical binding —
    // faithful to a real compiled template, so it fails if the render pipeline does
    // not provide `defineEmail` globally.
    const callDefineEmail = new Function(
      'options',
      'return defineEmail(options)',
    ) as (options: { subject: (props: { name: string }) => string }) => void
    const Email = defineComponent({
      name: 'SubjectEmail',
      props: { name: { type: String, required: true } },
      setup(props) {
        callDefineEmail({ subject: p => `Welcome, ${p.name}` })
        return () => h('html', [h('body', [h('p', `Hi ${props.name}`)])])
      },
    })

    const result = await renderEmailComponent(Email, { name: 'Ada' })

    expect(result.subject).toBe('Welcome, Ada')
  })
})
