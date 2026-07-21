import { parseDocument } from 'htmlparser2'
import { marked, Renderer } from 'marked'
import { parseCssInJsToInlineCss } from './parse-css-in-js-to-inline-css'
import type { StylesType } from './styles'
import { styles } from './styles'

const SAFE_MARKDOWN_URL_SCHEMES = new Set(['cid', 'http', 'https', 'mailto', 'tel'])

function escapeText(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}

function decodeAttributeEntities(value: string): string {
  const serialized = value
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
  const document = parseDocument(`<a href="${serialized}"></a>`)
  const anchor = document.children[0]
  return anchor && 'attribs' in anchor
    ? anchor.attribs.href ?? value
    : value
}

function assertSafeUrl(kind: 'image' | 'link', value: string): void {
  // Decode character references exactly as an HTML client will, then remove
  // control/space characters that URL parsers ignore inside a scheme. This
  // catches forms such as `javascript&#58;` and `java&#10;script:` as well as the
  // obvious spelling.
  const decoded = decodeAttributeEntities(value)
  const canonical = [...decoded.trim()]
    .filter((character) => {
      const codePoint = character.codePointAt(0)!
      return codePoint > 0x20 && codePoint !== 0x7F
    })
    .join('')
  const scheme = /^([a-z][a-z\d+.-]*):/i.exec(canonical)?.[1]?.toLowerCase()
  if (scheme !== undefined && !SAFE_MARKDOWN_URL_SCHEMES.has(scheme)) {
    throw new TypeError(`EMarkdown ${kind} URL uses an unsupported scheme: ${scheme}`)
  }
}

// Direct port of react-email's markdown/markdown.tsx renderer. The custom marked Renderer
// emits the same inline-styled HTML string that React feeds into dangerouslySetInnerHTML.
// Keeping this as a plain string builder (rather than VNodes) preserves marked's exact
// whitespace/newline output, which the conformance oracle compares against.
export function renderMarkdown(
  source: string,
  markdownCustomStyles?: StylesType,
): string {
  const finalStyles = { ...styles, ...markdownCustomStyles }

  const styleAttribute = (style: StylesType[keyof StylesType]): string => {
    const inline = parseCssInJsToInlineCss(style)
    return inline !== '' ? ` style="${inline}"` : ''
  }

  const renderer = new Renderer()

  renderer.blockquote = ({ tokens }) => {
    const text = renderer.parser.parse(tokens)
    return `<blockquote${styleAttribute(finalStyles.blockQuote)}>\n${text}</blockquote>\n`
  }

  renderer.br = () => {
    return `<br${styleAttribute(finalStyles.br)} />`
  }

  renderer.code = ({ text }) => {
    text = `${escapeText(text.replace(/\n$/, ''))}\n`
    return `<pre${styleAttribute(finalStyles.codeBlock)}><code>${text}</code></pre>\n`
  }

  renderer.codespan = ({ text }) => {
    return `<code${styleAttribute(finalStyles.codeInline)}>${escapeText(text)}</code>`
  }

  renderer.del = ({ tokens }) => {
    const text = renderer.parser.parseInline(tokens)
    return `<del${styleAttribute(finalStyles.strikethrough)}>${text}</del>`
  }

  renderer.em = ({ tokens }) => {
    const text = renderer.parser.parseInline(tokens)
    return `<em${styleAttribute(finalStyles.italic)}>${text}</em>`
  }

  renderer.heading = ({ tokens, depth }) => {
    const text = renderer.parser.parseInline(tokens)
    return `<h${depth}${styleAttribute(finalStyles[`h${depth}` as keyof StylesType])}>${text}</h${depth}>`
  }

  renderer.hr = () => {
    return `<hr${styleAttribute(finalStyles.hr)} />\n`
  }

  renderer.image = ({ href, text, title }) => {
    assertSafeUrl('image', href)
    return `<img src="${href.replaceAll('"', '&quot;')}" alt="${text.replaceAll('"', '&quot;')}"${
      title ? ` title="${title.replaceAll('"', '&quot;')}"` : ''
    }${styleAttribute(finalStyles.image)}>`
  }

  renderer.link = ({ href, title, tokens }) => {
    assertSafeUrl('link', href)
    const text = renderer.parser.parseInline(tokens)
    return `<a href="${href.replaceAll('"', '&quot;')}" target="_blank"${
      title ? ` title="${title.replaceAll('"', '&quot;')}"` : ''
    }${styleAttribute(finalStyles.link)}>${text}</a>`
  }

  renderer.listitem = ({ tokens, loose }) => {
    const hasNestedList = tokens.some(token => token.type === 'list')
    const text = loose || hasNestedList
      ? renderer.parser.parse(tokens)
      : renderer.parser.parseInline(tokens)
    return `<li${styleAttribute(finalStyles.li)}>${text}</li>\n`
  }

  renderer.html = () => {
    throw new TypeError('EMarkdown does not support raw HTML')
  }

  renderer.list = ({ items, ordered, start }) => {
    const type = ordered ? 'ol' : 'ul'
    const startAt = ordered && start !== 1 ? ` start="${start}"` : ''
    const inline = parseCssInJsToInlineCss(finalStyles[ordered ? 'ol' : 'ul'])
    return `<${type}${startAt}${inline !== '' ? ` style="${inline}"` : ''}>\n${
      items.map(item => renderer.listitem(item)).join('')
    }</${type}>\n`
  }

  renderer.paragraph = ({ tokens }) => {
    const text = renderer.parser.parseInline(tokens)
    return `<p${styleAttribute(finalStyles.p)}>${text}</p>\n`
  }

  renderer.strong = ({ tokens }) => {
    const text = renderer.parser.parseInline(tokens)
    return `<strong${styleAttribute(finalStyles.bold)}>${text}</strong>`
  }

  renderer.table = ({ header, rows }) => {
    const styleTable = parseCssInJsToInlineCss(finalStyles.table)
    const styleThead = parseCssInJsToInlineCss(finalStyles.thead)
    const styleTbody = parseCssInJsToInlineCss(finalStyles.tbody)

    const theadRow = renderer.tablerow({
      text: header.map(cell => renderer.tablecell(cell)).join(''),
    })

    const tbodyRows = rows
      .map(row => renderer.tablerow({
        text: row.map(cell => renderer.tablecell(cell)).join(''),
      }))
      .join('')

    const thead = `<thead${styleThead ? ` style="${styleThead}"` : ''}>\n${theadRow}</thead>`
    const tbody = `<tbody${styleTbody ? ` style="${styleTbody}"` : ''}>${tbodyRows}</tbody>`

    return `<table role="presentation"${styleTable ? ` style="${styleTable}"` : ''}>\n${thead}\n${tbody}</table>\n`
  }

  renderer.tablecell = ({ tokens, align, header }) => {
    const text = renderer.parser.parseInline(tokens)
    const type = header ? 'th' : 'td'
    const cellStyle = styleAttribute(finalStyles.td)
    const tag = align
      ? `<${type} align="${align}"${cellStyle}>`
      : `<${type}${cellStyle}>`
    return `${tag}${text}</${type}>\n`
  }

  renderer.tablerow = ({ text }) => {
    return `<tr${styleAttribute(finalStyles.tr)}>\n${text}</tr>\n`
  }

  return marked.parse(source, {
    renderer,
    async: false,
  })
}
