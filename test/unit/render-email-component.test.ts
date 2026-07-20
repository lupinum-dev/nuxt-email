import type { Component } from 'vue'
import { createCommentVNode, defineComponent, Fragment, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EmailRenderError } from '../../src/runtime/render/errors'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'

describe('component rendering', () => {
  it('removes proven Vue SSR placeholders while preserving meaningful comments', async () => {
    const FragmentEmail = defineComponent({
      name: 'FragmentEmail',
      setup() {
        return () => h(Fragment, [
          h('p', 'First'),
          false,
          h(Fragment, [h('p', 'Second')]),
          createCommentVNode('meaningful'),
          createCommentVNode('[if mso]><table><tr><td>Outlook</td></tr></table><![endif]'),
        ])
      },
    })

    const html = await renderComponentToHtml(FragmentEmail)

    expect(html).toContain('<p>First</p><p>Second</p><!--meaningful-->')
    expect(html).toContain('<!--[if mso]><table><tr><td>Outlook</td></tr></table><![endif]-->')
    expect(html).not.toContain('<!--[-->')
    expect(html).not.toContain('<!--]-->')
    expect(html).not.toContain('<!---->')
  })

  it('rejects multiple undeclared root props deterministically', async () => {
    const PropFreeEmail = defineComponent({
      name: 'PropFreeEmail',
      setup: () => () => h('p', 'Safe'),
    })

    await expect(renderComponentToHtml(PropFreeEmail, { first: 1, second: 2 }))
      .rejects.toThrow('Unknown email component props: first, second')
  })

  it('returns only deterministic HTML and text', async () => {
    const Email = defineComponent({
      name: 'DeterministicEmail',
      setup: () => () => h('p', 'Hello'),
    })

    const first = await renderEmailComponent(Email)
    const second = await renderEmailComponent(Email)

    expect(first).toEqual(second)
    expect(Object.keys(first)).toEqual(['html', 'text'])
    expect(first.text).toBe('Hello')
  })
})

describe('render errors', () => {
  it('wraps a named component failure and preserves the original cause', async () => {
    const cause = new Error('fixture failed')
    const BrokenEmail = defineComponent({
      name: 'BrokenEmail',
      setup() {
        throw cause
      },
    })

    const error = await renderEmailComponent(BrokenEmail).catch(value => value)

    expect(error).toBeInstanceOf(EmailRenderError)
    expect(error).toMatchObject({
      name: 'EmailRenderError',
      componentName: 'BrokenEmail',
      cause,
      message: 'Failed to render email component BrokenEmail',
    })
  })

  it('uses the compiled SFC name when a script-setup component fails', async () => {
    const cause = new Error('SFC failed')
    const ScriptSetupEmail = defineComponent({
      setup() {
        throw cause
      },
    }) as Component & { __name?: string }
    ScriptSetupEmail.__name = 'WelcomeEmail'

    await expect(renderEmailComponent(ScriptSetupEmail))
      .rejects.toMatchObject({ componentName: 'WelcomeEmail', cause })
  })

  it('uses the name of a functional component when it fails', async () => {
    const cause = new Error('functional failed')
    const FunctionalEmail = () => {
      throw cause
    }

    await expect(renderEmailComponent(FunctionalEmail))
      .rejects.toMatchObject({ componentName: 'FunctionalEmail', cause })
  })
})
