export const EMAIL_DOCTYPE = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'

const LEADING_DOCTYPE = /^\s*<!doctype[^>]*>/i
const HTML_OPEN_TAG = /<html(?:\s|>)/gi
const HTML_CLOSE_TAG = /<\/html>/gi
const BODY_OPEN_TAG = /<body(?:\s|>)/gi
const BODY_CLOSE_TAG = /<\/body>/gi

export function assembleEmailDocument(renderedHtml: string): string {
  return `${EMAIL_DOCTYPE}${renderedHtml.replace(LEADING_DOCTYPE, '')}`
}

function matchCount(value: string, pattern: RegExp): number {
  return value.match(pattern)?.length ?? 0
}

export function assertCompleteEmailDocument(html: string): void {
  const document = html.startsWith(EMAIL_DOCTYPE)
    ? html.slice(EMAIL_DOCTYPE.length)
    : html

  const hasOneHtmlRoot = /^<html(?:\s|>)/i.test(document)
    && /<\/html>$/i.test(document)
    && matchCount(document, HTML_OPEN_TAG) === 1
    && matchCount(document, HTML_CLOSE_TAG) === 1
  const hasOneBody = matchCount(document, BODY_OPEN_TAG) === 1
    && matchCount(document, BODY_CLOSE_TAG) === 1

  if (!hasOneHtmlRoot || !hasOneBody) {
    throw new TypeError(
      'Email templates must render exactly one <html> root containing exactly one <body>; wrap the template in EHtml and EBody',
    )
  }
}
