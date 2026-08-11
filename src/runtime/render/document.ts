import { Parser } from 'htmlparser2'

export const EMAIL_DOCTYPE = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'

const LEADING_DOCTYPE = /^\s*<!doctype[^>]*>/i
const EMAIL_COMPONENT_TAG = /^E[A-Za-z0-9]+$/

export function assembleEmailDocument(renderedHtml: string): string {
  return `${EMAIL_DOCTYPE}${renderedHtml.replace(LEADING_DOCTYPE, '')}`
}

export function assertNoUnresolvedEmailComponents(renderedHtml: string): void {
  let unresolvedComponent: string | undefined
  const parser = new Parser({
    onopentag(name) {
      if (unresolvedComponent === undefined && EMAIL_COMPONENT_TAG.test(name)) {
        unresolvedComponent = name
      }
    },
  }, { xmlMode: true })
  parser.end(renderedHtml)

  if (unresolvedComponent !== undefined) {
    throw new TypeError(
      `Unknown email component <${unresolvedComponent}>. Configure it or use a registered E* component.`,
    )
  }
}

export function assertCompleteEmailDocument(html: string): void {
  const document = html.startsWith(EMAIL_DOCTYPE)
    ? html.slice(EMAIL_DOCTYPE.length)
    : html

  const stack: string[] = []
  let bodyCount = 0
  let bodyClosed = false
  let headCount = 0
  let htmlCount = 0
  let htmlClosed = false
  let invalid = false

  const parser = new Parser({
    onopentag(name) {
      const parent = stack.at(-1)
      if (name === 'html') {
        htmlCount++
        if (stack.length > 0 || htmlClosed) invalid = true
      }
      else if (name === 'head') {
        headCount++
        if (parent !== 'html' || bodyCount > 0) invalid = true
      }
      else if (name === 'body') {
        bodyCount++
        if (parent !== 'html' || bodyClosed) invalid = true
      }
      else if (!stack.includes('head') && !stack.includes('body')) {
        invalid = true
      }
      stack.push(name)
    },
    ontext(value) {
      if (value.trim() !== '' && !stack.includes('head') && !stack.includes('body')) {
        invalid = true
      }
    },
    onclosetag(name, isImplied) {
      const index = stack.lastIndexOf(name)
      if (index === -1) {
        invalid = true
        return
      }
      if ((name === 'html' || name === 'head' || name === 'body') && isImplied) {
        invalid = true
      }
      stack.splice(index)
      if (name === 'body') bodyClosed = true
      if (name === 'html') htmlClosed = true
    },
  })
  parser.end(document)

  if (
    invalid
    || stack.length > 0
    || htmlCount !== 1
    || !htmlClosed
    || headCount > 1
    || bodyCount !== 1
    || !bodyClosed
  ) {
    throw new TypeError(
      'Email templates must render exactly one <html> root containing exactly one <body>; wrap the template in EHtml and EBody',
    )
  }
}
