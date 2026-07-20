export const EMAIL_DOCTYPE = '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">'

const LEADING_DOCTYPE = /^\s*<!doctype[^>]*>/i

export function assembleEmailDocument(renderedHtml: string): string {
  return `${EMAIL_DOCTYPE}${renderedHtml.replace(LEADING_DOCTYPE, '')}`
}
