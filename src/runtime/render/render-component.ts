import type { Component } from 'vue'
import type { EmailRenderContext } from './define-email'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as emailComponents from '../components'
import { createEmailRenderContext } from './define-email'
import { assembleEmailDocument } from './document'

type ComponentWithProps = Component & {
  props?: readonly string[] | Record<string, unknown>
}

function assertKnownProps(component: Component, props: Record<string, unknown>): void {
  const declaration = (component as ComponentWithProps).props
  const knownProps = new Set(Array.isArray(declaration) ? declaration : Object.keys(declaration ?? {}))
  const unknownProps = Object.keys(props).filter(name => !knownProps.has(name)).sort()

  if (unknownProps.length > 0) {
    throw new TypeError(`Unknown email component prop${unknownProps.length === 1 ? '' : 's'}: ${unknownProps.join(', ')}`)
  }

  if (Array.isArray(declaration) || declaration === undefined) {
    return
  }

  const missingProps = Object.entries(declaration)
    .filter(([name, option]) => {
      return typeof option === 'object'
        && option !== null
        && 'required' in option
        && option.required === true
        && !Object.hasOwn(props, name)
    })
    .map(([name]) => name)
    .sort()

  if (missingProps.length > 0) {
    throw new TypeError(`Missing required email component prop${missingProps.length === 1 ? '' : 's'}: ${missingProps.join(', ')}`)
  }
}

export async function renderComponentToHtml(
  component: Component,
  props: Record<string, unknown> = {},
  context: EmailRenderContext = createEmailRenderContext(),
): Promise<string> {
  assertKnownProps(component, props)
  const app = createSSRApp(component, props)
  for (const [name, emailComponent] of Object.entries(emailComponents)) {
    app.component(name, emailComponent)
  }
  const renderedHtml = (await renderToString(app, context))
    .replaceAll('<!--[-->', '')
    .replaceAll('<!--]-->', '')
    .replaceAll('<!---->', '')

  return assembleEmailDocument(renderedHtml)
}
