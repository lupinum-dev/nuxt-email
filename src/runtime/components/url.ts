/**
 * The lowercase scheme of a URL, or `undefined` for a relative URL, an `#anchor` or a
 * merge tag such as `{{unsubscribe}}`. Browsers ignore whitespace and control characters
 * inside a scheme, so `java\nscript:` is `javascript`.
 */
export function urlScheme(value: string): string | undefined {
  let canonical = ''
  for (const character of value) {
    const codePoint = character.codePointAt(0)!
    if (codePoint > 0x20 && codePoint !== 0x7F) canonical += character
  }
  return /^([a-z][a-z\d+.-]*):/i.exec(canonical)?.[1]?.toLowerCase()
}

// Schemes that run script when an email client opens the URL. `data:` stays allowed in
// `src`, where it is an inline image.
const UNSAFE_SCHEMES = {
  href: new Set(['javascript', 'vbscript', 'data']),
  src: new Set(['javascript', 'vbscript']),
}

export function assertSafeUrl(component: string, attribute: keyof typeof UNSAFE_SCHEMES, value: string): void {
  const scheme = urlScheme(value)
  if (scheme !== undefined && UNSAFE_SCHEMES[attribute].has(scheme)) {
    throw new TypeError(`${component} ${attribute} uses an unsafe URL scheme: ${scheme}`)
  }
}
