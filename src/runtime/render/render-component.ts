import type { Component } from 'vue'
import type { EmailRenderContext } from './define-email'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import * as emailComponents from '../components'
import { applyTailwindPostRender } from '../tailwind/post-render'
import { createEmailRenderContext, defineEmail, runWithEmailRenderContext } from './define-email'
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

/**
 * Templates authored as SFCs call `defineEmail(...)` as a bare identifier: it is
 * a Nuxt server auto-import, so Nuxt's build injects the import and the compiled
 * `setup()` never references a global. Outside Nuxt — a template rendered through
 * the `nuxt-email/testing` subpath in a plain Vitest run — no auto-import exists,
 * so the same compiled `setup()` resolves `defineEmail` off globalThis. Provide it
 * there, mirroring the E* components registered on the app above. `defineEmail`
 * reads the active render context from AsyncLocalStorage, so a single shared global
 * reference stays correct across concurrent renders. `??=` never clobbers a binding
 * already present (e.g. Nuxt's own).
 */
function provideDefineEmailGlobal(): void {
  const globalScope = globalThis as typeof globalThis & { defineEmail?: typeof defineEmail }
  globalScope.defineEmail ??= defineEmail
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
  provideDefineEmailGlobal()

  // Vue SSR swallows errors thrown from an async `<script setup>` (after any
  // await): `renderToString` resolves to `<!---->` instead of rejecting, which
  // would otherwise surface downstream as a misleading incomplete-document error
  // and mask the real cause (e.g. a failed data fetch). Capturing the first error
  // through the app error handler and rethrowing it preserves the true cause.
  // Installing a handler also makes synchronous setup/render throws resolve with a
  // captured error rather than reject, so this one path covers both cases.
  let renderFailure: { cause: unknown } | undefined
  app.config.errorHandler = (error) => {
    renderFailure ??= { cause: error }
  }

  const renderedHtml = await runWithEmailRenderContext(context, () => renderToString(app, context))
  if (renderFailure !== undefined) {
    throw renderFailure.cause
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
