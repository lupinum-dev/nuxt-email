import type { Component } from 'vue'
import type { EmailRenderContext } from './define-email'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { emailComponentRegistry } from '../components/email-component-registry'
import { applyTailwindPostRender } from '../tailwind/post-render'
import { createEmailRenderContext, runWithEmailRenderContext } from './define-email'
import { assembleEmailDocument } from './document'

export type EmailComponentRegistry = Readonly<Record<string, Component>>

type ComponentWithProps = Component & {
  props?: readonly string[] | Record<string, unknown>
}

function assertKnownProps(component: Component, props: Record<string, unknown>): void {
  const declaration = (component as ComponentWithProps).props
  // A functional component may carry a TypeScript props contract without Vue
  // runtime prop metadata. Its public helper call remains statically checked,
  // but there is nothing sound to validate here at runtime.
  if (typeof component === 'function' && declaration === undefined) {
    return
  }
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
  componentRegistry: EmailComponentRegistry = emailComponentRegistry,
): Promise<string> {
  assertKnownProps(component, props)
  const app = createSSRApp(component, props)
  for (const [name, emailComponent] of Object.entries(componentRegistry)) {
    app.component(name, emailComponent)
  }
  // Vue SSR swallows errors thrown from an async `<script setup>` (after any
  // await): `renderToString` resolves to `<!---->` instead of rejecting, which
  // would otherwise surface downstream as a misleading incomplete-document error
  // and mask the real cause (e.g. a failed data fetch). Capturing the first error
  // through the app error handler and rethrowing it preserves the true cause.
  // Installing a handler also makes synchronous setup/render throws resolve with a
  // captured error rather than reject, so this one path covers both cases.
  let renderFailure: { cause: unknown } | undefined
  let unresolvedEmailComponent: string | undefined
  app.config.errorHandler = (error) => {
    renderFailure ??= { cause: error }
  }
  app.config.warnHandler = (message, _instance, trace) => {
    const unresolved = message.match(/^Failed to resolve component: (E[A-Za-z0-9]+)/)?.[1]
    if (unresolved !== undefined) {
      unresolvedEmailComponent ??= unresolved
      return
    }
    console.warn(`[Vue warn]: ${message}${trace}`)
  }

  const renderedHtml = await runWithEmailRenderContext(context, () => renderToString(app, context))
  if (renderFailure !== undefined) {
    throw renderFailure.cause
  }
  if (unresolvedEmailComponent !== undefined) {
    throw new TypeError(
      `Unknown email component <${unresolvedEmailComponent}>. Configure it or use a registered E* component.`,
    )
  }

  const document = assembleEmailDocument(
    renderedHtml
      .replaceAll('<!--[-->', '')
      .replaceAll('<!--]-->', '')
      .replaceAll('<!---->', ''),
  )

  // Complete any Tailwind region: inline nested plain elements, fill the head
  // <style> with the full non-inlinable CSS, strip region markers. A no-op
  // (byte-identical) when no <ETailwind> registered a region.
  return applyTailwindPostRender(document, context.tailwindRegions)
}
