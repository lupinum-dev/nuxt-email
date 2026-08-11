import type { Component, FunctionalComponent } from 'vue'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import { createCommentVNode, defineComponent, Fragment, h, resolveComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import * as emailComponents from '../../src/runtime/components'
import { EMAIL_COMPONENT_NAMES } from '../../src/runtime/components/email-component-names'
import { EmailRenderError } from '../../src/runtime/render/errors'
import { renderComponentToHtml } from '../../src/runtime/render/render-component'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'

const executeFile = promisify(execFile)
const workspaceDirectory = fileURLToPath(new URL('../..', import.meta.url))

describe('component rendering', () => {
  it('registers the supported email components for compiled no-import templates', async () => {
    const NoImportEmail = defineComponent({
      name: 'NoImportEmail',
      setup() {
        const EHtml = resolveComponent('EHtml')
        const EBody = resolveComponent('EBody')
        const EText = resolveComponent('EText')
        return () => h(EHtml, null, {
          default: () => h(EBody, null, {
            default: () => h(EText, null, { default: () => 'Hello' }),
          }),
        })
      },
    })

    expect(Object.keys(emailComponents).sort()).toEqual([...EMAIL_COMPONENT_NAMES].sort())
    await expect(renderEmailComponent(NoImportEmail)).resolves.toMatchObject({ text: 'Hello' })
  })

  it('rejects unresolved E-prefixed components instead of emitting fake email markup', async () => {
    const UnconfiguredEmail = defineComponent({
      name: 'UnconfiguredEmail',
      setup() {
        const ECodeBlock = resolveComponent('ECodeBlock')
        return () => h('html', [
          h('body', [
            h(ECodeBlock, { code: 'const answer = 42', language: 'typescript' }),
          ]),
        ])
      },
    })

    const error = await renderEmailComponent(UnconfiguredEmail).catch(value => value)

    expect(error).toBeInstanceOf(EmailRenderError)
    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toBe(
      'Unknown email component <ECodeBlock>. Configure it or use a registered E* component.',
    )
  })

  it('rejects unresolved E-prefixed components when Vue production warnings are disabled', async () => {
    const script = `
      import { defineComponent, h, resolveComponent } from 'vue'
      import { renderEmailComponent } from './src/runtime/render/render-email-component.ts'
      const Email = defineComponent({
        name: 'ProductionUnresolvedEmail',
        setup() {
          const ECodeBlock = resolveComponent('ECodeBlock')
          return () => h('html', [h('body', [h(ECodeBlock, { code: 'x', language: 'typescript' })])])
        },
      })
      try {
        await renderEmailComponent(Email)
        process.stdout.write('resolved')
      }
      catch (error) {
        process.stdout.write(JSON.stringify({
          cause: error.cause instanceof Error ? error.cause.message : String(error.cause),
          name: error.name,
        }))
      }
    `
    const { stdout } = await executeFile(process.execPath, [
      '--import',
      'tsx',
      '--input-type=module',
      '--eval',
      script,
    ], {
      cwd: workspaceDirectory,
      env: { ...process.env, NODE_ENV: 'production' },
    })

    expect(JSON.parse(stdout)).toEqual({
      cause: 'Unknown email component <ECodeBlock>. Configure it or use a registered E* component.',
      name: 'EmailRenderError',
    })
  })

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
      setup: () => () => h('html', [h('body', [h('p', 'Hello')])]),
    })

    const first = await renderEmailComponent(Email)
    const second = await renderEmailComponent(Email)

    expect(first).toEqual(second)
    expect(Object.keys(first)).toEqual(['html', 'text'])
    expect(first.text).toBe('Hello')
  })

  it('accepts typed functional-component props when no runtime declaration exists', async () => {
    const FunctionalEmail: FunctionalComponent<{ name: string }> = props =>
      h('html', [h('body', [h('p', `Hi ${props.name}`)])])

    const result = await renderEmailComponent(FunctionalEmail, { name: 'Ada' })

    expect(result.text).toBe('Hi Ada')
  })

  it.each([
    { name: 'empty', render: () => null },
    { name: 'text', render: () => 'text only' },
    { name: 'body-only', render: () => h('body', 'Body') },
    { name: 'fragment', render: () => h(Fragment, [h('html', [h('body')]), h('p', 'Outside')]) },
    { name: 'missing-body', render: () => h('html', [h('head')]) },
  ])('wraps an invalid $name template root with component context', async ({ render }) => {
    const InvalidEmail = defineComponent({
      name: 'InvalidEmail',
      setup: () => render,
    })

    const error = await renderEmailComponent(InvalidEmail).catch(value => value)

    expect(error).toBeInstanceOf(EmailRenderError)
    expect(error).toMatchObject({ componentName: 'InvalidEmail' })
    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toContain('exactly one <html> root containing exactly one <body>')
  })

  it('rejects missing required props in stable name order before rendering', async () => {
    const RequiredPropsEmail = defineComponent({
      name: 'RequiredPropsEmail',
      props: {
        second: { type: String, required: true },
        first: { type: String, required: true },
      },
      setup: () => () => h('html', [h('body')]),
    })

    const error = await renderEmailComponent(RequiredPropsEmail, {} as never).catch(value => value)

    expect(error).toBeInstanceOf(EmailRenderError)
    expect(error.cause).toBeInstanceOf(TypeError)
    expect(error.cause.message).toBe('Missing required email component props: first, second')
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

  it('surfaces the real cause thrown from an async setup, not a misleading document error', async () => {
    // Vue SSR resolves renderToString to '<!---->' when an async <script setup> throws after an
    // await, which would otherwise mask the true failure behind an incomplete-<html>-root error.
    const cause = new Error('async data fetch failed')
    const AsyncBrokenEmail = defineComponent({
      name: 'AsyncBrokenEmail',
      async setup() {
        await new Promise(resolve => setTimeout(resolve, 1))
        throw cause
      },
    })

    const error = await renderEmailComponent(AsyncBrokenEmail).catch(value => value)

    expect(error).toBeInstanceOf(EmailRenderError)
    expect(error).toMatchObject({ componentName: 'AsyncBrokenEmail', cause })
    expect(error.cause.message).not.toContain('exactly one <html> root')
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
