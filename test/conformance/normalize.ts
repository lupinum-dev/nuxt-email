const REACT_BOUNDARY_MARKERS = /<!--(?:\$|\/\$|html|head|body)-->/g

/**
 * Canonicalize a single attribute value for comparison:
 *  - `style`: drop a terminal `;` (react-dom omits it; Vue keeps it).
 *  - `class`: trim and collapse whitespace runs. react-dom renders a class string
 *    verbatim (so `${className || ''} cino` yields a leading space when unclassed),
 *    while Vue's `normalizeClass` trims it. Class-list whitespace is semantically
 *    insignificant, so absorb it here rather than diverge the rendered output.
 */
function normalizeAttributeValue(name: string, value: string): string {
  if (name === 'style') {
    return value.endsWith(';') ? value.slice(0, -1) : value
  }
  if (name === 'class') {
    return value.trim().replace(/\s+/g, ' ')
  }
  return value
}

function normalizeTag(tag: string): string {
  if (tag.startsWith('<!--') || tag.startsWith('<!DOCTYPE') || tag.startsWith('</')) {
    return tag
  }

  let nameEnd = 1
  while (nameEnd < tag.length && !/[\s/>]/.test(tag.charAt(nameEnd))) {
    nameEnd++
  }
  if (nameEnd === 1) {
    return tag
  }

  const attributes: Array<{ name: string, value: string }> = []
  const tagName = tag.slice(1, nameEnd)
  const sourceEnd = tag.endsWith('/>') ? tag.length - 2 : tag.length - 1
  const source = tag.slice(nameEnd, sourceEnd)
  let cursor = 0

  while (cursor < source.length) {
    while (/\s/.test(source.charAt(cursor))) {
      cursor++
    }
    if (cursor >= source.length) {
      break
    }

    const nameMatch = /^[^\s=/>]+/.exec(source.slice(cursor))
    if (!nameMatch) {
      return tag.replace(/\s*\/>$/, '>')
    }

    const originalName = nameMatch[0]
    const name = originalName === 'cellPadding'
      ? 'cellpadding'
      : originalName === 'cellSpacing'
        ? 'cellspacing'
        : originalName
    cursor += originalName.length

    while (/\s/.test(source.charAt(cursor))) {
      cursor++
    }

    if (source.charAt(cursor) !== '=') {
      attributes.push({ name, value: name })
      continue
    }

    cursor++
    while (/\s/.test(source.charAt(cursor))) {
      cursor++
    }

    const quote = source.charAt(cursor)
    if (quote !== '"' && quote !== '\'') {
      const valueMatch = /^[^\s>]+/.exec(source.slice(cursor))
      if (!valueMatch) {
        return tag.replace(/\s*\/>$/, '>')
      }
      attributes.push({ name, value: `${name}=${valueMatch[0]}` })
      cursor += valueMatch[0].length
      continue
    }

    const valueStart = cursor + 1
    const valueEnd = source.indexOf(quote, valueStart)
    if (valueEnd === -1) {
      return tag.replace(/\s*\/>$/, '>')
    }

    const value = source.slice(valueStart, valueEnd)
    const normalizedValue = normalizeAttributeValue(name, value)
    attributes.push({ name, value: `${name}=${quote}${normalizedValue}${quote}` })
    cursor = valueEnd + 1
  }

  attributes.sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
  return `<${tagName}${attributes.length > 0 ? ` ${attributes.map(attribute => attribute.value).join(' ')}` : ''}>`
}

function normalizeTags(html: string): string {
  let result = ''
  let cursor = 0

  while (cursor < html.length) {
    const tagStart = html.indexOf('<', cursor)
    if (tagStart === -1) {
      return result + html.slice(cursor)
    }

    result += html.slice(cursor, tagStart)

    if (html.startsWith('<!--', tagStart)) {
      const commentEnd = html.indexOf('-->', tagStart + 4)
      if (commentEnd === -1) {
        return result + html.slice(tagStart)
      }
      result += html.slice(tagStart, commentEnd + 3)
      cursor = commentEnd + 3
      continue
    }

    let quote: '"' | '\'' | undefined
    let tagEnd = tagStart + 1
    for (; tagEnd < html.length; tagEnd++) {
      const character = html[tagEnd]
      if (quote) {
        if (character === quote) {
          quote = undefined
        }
      }
      else if (character === '"' || character === '\'') {
        quote = character
      }
      else if (character === '>') {
        break
      }
    }

    if (tagEnd === html.length) {
      return result + html.slice(tagStart)
    }

    result += normalizeTag(html.slice(tagStart, tagEnd + 1))
    cursor = tagEnd + 1
  }

  return result
}

/**
 * Canonicalize rendered email HTML so two structurally equivalent documents
 * compare equal regardless of insignificant serialization differences. Applies:
 *  - strips framework boundary comment markers (`<!--$-->`, `<!--/$-->`, and the
 *    `<!--html-->` / `<!--head-->` / `<!--body-->` markers React emits),
 *  - sorts each element's attributes by name,
 *  - drops a trailing `;` from `style` values and collapses `class` whitespace,
 *  - normalizes self-closing tags to their open-tag form and lowercases the
 *    `cellPadding` / `cellSpacing` attribute names.
 *
 * Use it to assert that your email matches a fixed snapshot or a reference
 * renderer without brittle whitespace/ordering failures. This is the exact
 * normalizer nuxt-email uses for its own React Email conformance suite.
 */
export function normalizeEmailHtml(html: string): string {
  return normalizeTags(html.replace(REACT_BOUNDARY_MARKERS, '')).trim()
}
