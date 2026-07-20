const REACT_BOUNDARY_MARKERS = /<!--(?:\$|\/\$|html|head|body)-->/g

function normalizeTag(tag: string): string {
  if (tag.startsWith('<!--') || tag.startsWith('<!DOCTYPE')) {
    return tag
  }

  let result = ''
  let cursor = 0

  while (cursor < tag.length) {
    const attributeMatch = tag.slice(cursor).match(/^([a-z][\w:-]*)(=)(["'])/i)
    if (!attributeMatch || (cursor > 0 && !/\s/.test(tag.charAt(cursor - 1)))) {
      result += tag.charAt(cursor)
      cursor++
      continue
    }

    const originalName = attributeMatch[1]!
    const equals = attributeMatch[2]!
    const quote = attributeMatch[3]!
    const normalizedName = originalName === 'cellPadding'
      ? 'cellpadding'
      : originalName === 'cellSpacing'
        ? 'cellspacing'
        : originalName
    const valueStart = cursor + attributeMatch[0].length
    const valueEnd = tag.indexOf(quote, valueStart)
    if (valueEnd === -1) {
      return result + tag.slice(cursor)
    }

    const value = tag.slice(valueStart, valueEnd)
    const normalizedValue = normalizedName === 'style' && value.endsWith(';')
      ? value.slice(0, -1)
      : value

    result += `${normalizedName}${equals}${quote}${normalizedValue}${quote}`
    cursor = valueEnd + 1
  }

  return result.replace(/\s*\/>$/, '>')
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

export function normalizeEmailHtml(html: string): string {
  return normalizeTags(html.replace(REACT_BOUNDARY_MARKERS, '')).trim()
}
