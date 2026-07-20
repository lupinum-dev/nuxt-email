import type { Component } from 'vue'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { assembleEmailDocument } from './document'

type ComponentWithProps = Component & {
  props?: readonly string[] | Record<string, unknown>
}

function assertKnownProps(component: Component, props: Record<string, unknown>): void {
  const declaration = (component as ComponentWithProps).props
  const knownProps = new Set(Array.isArray(declaration) ? declaration : Object.keys(declaration ?? {}))
  const unknownProps = Object.keys(props).filter(name => !knownProps.has(name))

  if (unknownProps.length > 0) {
    throw new TypeError(`Unknown email component prop${unknownProps.length === 1 ? '' : 's'}: ${unknownProps.join(', ')}`)
  }
}

export async function renderComponentToHtml(
  component: Component,
  props: Record<string, unknown> = {},
): Promise<string> {
  assertKnownProps(component, props)
  const app = createSSRApp(component, props)
  const renderedHtml = (await renderToString(app))
    .replaceAll('<!--[-->', '')
    .replaceAll('<!--]-->', '')
    .replaceAll('<!---->', '')

  return assembleEmailDocument(renderedHtml)
}
