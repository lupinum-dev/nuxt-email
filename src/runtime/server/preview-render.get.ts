import { emailTemplates, renderEmail } from '#nuxt-email/registry'
import {
  defineEventHandler,
  getQuery,
  setHeaders,
  setResponseStatus,
} from 'h3'

export const PREVIEW_RENDER_CSP = [
  'default-src \'none\'',
  'script-src \'none\'',
  'style-src \'unsafe-inline\'',
  'img-src data: https: http:',
  'font-src data: https: http:',
  'frame-ancestors \'self\'',
  'base-uri \'none\'',
  'object-src \'none\'',
  'form-action \'none\'',
].join('; ')

// Dark-mode simulation: inject `color-scheme: dark` into the rendered document's
// <head>. This flips the iframe's UA canvas and default form-control colors to dark,
// approximating how a dark email client frames the message. It deliberately cannot
// re-trigger the email's own `@media (prefers-color-scheme: dark)` rules — doing that
// requires browser-level media emulation (the DevTools protocol), which a dev handler
// injecting CSS has no way to reach. It is a visual approximation of the client chrome,
// not a full dark render. The unmodified html is what `bytes`/`Copy`/`Open` report.
const DARK_SIMULATION_STYLE = '<style data-nuxt-email-dark-simulation>:root{color-scheme:dark}</style>'

function injectDarkSchemeSimulation(html: string): string {
  const headClose = html.indexOf('</head>')
  return headClose === -1
    ? DARK_SIMULATION_STYLE + html
    : html.slice(0, headClose) + DARK_SIMULATION_STYLE + html.slice(headClose)
}

class PreviewRequestError extends Error {
  readonly statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'PreviewRequestError'
    this.statusCode = statusCode
  }
}

interface SerializedPreviewError {
  name: string
  message: string
  stack?: string
  componentName?: string
  requestedName?: string
  knownNames?: readonly string[]
  cause?: SerializedPreviewError
}

function serializeError(error: unknown, seen = new Set<unknown>()): SerializedPreviewError {
  if (!(error instanceof Error)) {
    return {
      name: typeof error,
      message: String(error),
    }
  }

  if (seen.has(error)) {
    return {
      name: error.name,
      message: '[circular error cause]',
    }
  }
  seen.add(error)

  const serialized: SerializedPreviewError = {
    name: error.name,
    message: error.message,
  }
  if (error.stack) {
    serialized.stack = error.stack
  }
  if ('componentName' in error && typeof error.componentName === 'string') {
    serialized.componentName = error.componentName
  }
  if ('requestedName' in error && typeof error.requestedName === 'string') {
    serialized.requestedName = error.requestedName
  }
  if ('knownNames' in error && Array.isArray(error.knownNames)) {
    serialized.knownNames = error.knownNames.filter(name => typeof name === 'string')
  }
  if ('cause' in error && error.cause !== undefined) {
    serialized.cause = serializeError(error.cause, seen)
  }

  return serialized
}

function requiredString(value: unknown, parameter: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new PreviewRequestError(400, `Query parameter "${parameter}" must be one non-empty string`)
  }

  return value
}

function fixtureProps(value: unknown, name: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`Preview fixture ${name}.fixtures.ts must default-export a props object`)
  }

  return value as Record<string, unknown>
}

export default defineEventHandler(async (event) => {
  setHeaders(event, {
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
  })

  const query = getQuery(event)
  const requestedName = typeof query.name === 'string' ? query.name : undefined

  try {
    const name = requiredString(query.name, 'name')
    const format = query.format === undefined ? 'html' : requiredString(query.format, 'format')
    if (format !== 'html' && format !== 'json') {
      throw new PreviewRequestError(400, 'Query parameter "format" must be "html" or "json"')
    }
    const scheme = query.scheme === undefined ? 'light' : requiredString(query.scheme, 'scheme')
    if (scheme !== 'light' && scheme !== 'dark') {
      throw new PreviewRequestError(400, 'Query parameter "scheme" must be "light" or "dark"')
    }

    const template = Object.hasOwn(emailTemplates, name)
      ? emailTemplates[name]
      : undefined
    if (!template) {
      throw new PreviewRequestError(
        404,
        `Unknown email template "${name}"; known templates: ${Object.keys(emailTemplates).join(', ')}`,
      )
    }
    if (!template.fixture) {
      throw new PreviewRequestError(404, `Email template "${name}" has no colocated ${name}.fixtures.ts file`)
    }

    const fixtureModule = await template.fixture()
    const output = await renderEmail(name, fixtureProps(fixtureModule.default, name))
    if (format === 'json') {
      setHeaders(event, { 'content-type': 'application/json; charset=utf-8' })
      // `bytes` is the exact UTF-8 length of the unmodified html — the Gmail clipping
      // budget the client warns against (dark simulation never changes it).
      return { name, ...output, bytes: Buffer.byteLength(output.html, 'utf8') }
    }

    setHeaders(event, {
      'content-security-policy': PREVIEW_RENDER_CSP,
      'content-type': 'text/html; charset=utf-8',
    })
    return scheme === 'dark' ? injectDarkSchemeSimulation(output.html) : output.html
  }
  catch (error) {
    const statusCode = error instanceof PreviewRequestError ? error.statusCode : 500
    const serializedError = serializeError(error)
    setResponseStatus(event, statusCode)
    setHeaders(event, { 'content-type': 'application/json; charset=utf-8' })

    return {
      statusCode,
      statusMessage: serializedError.message,
      data: {
        templateName: requestedName,
        error: serializedError,
      },
    }
  }
})
