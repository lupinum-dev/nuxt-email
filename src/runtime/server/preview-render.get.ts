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
      return { name, ...output }
    }

    setHeaders(event, {
      'content-security-policy': PREVIEW_RENDER_CSP,
      'content-type': 'text/html; charset=utf-8',
    })
    return output.html
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
