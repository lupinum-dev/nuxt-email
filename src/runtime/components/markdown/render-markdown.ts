import { marked, Renderer } from 'marked'
import { parseCssInJsToInlineCss } from './parse-css-in-js-to-inline-css'
import type { StylesType } from './styles'
import { styles } from './styles'

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
    text = `${text.replace(/\n$/, '')}\n`
    return `<pre${styleAttribute(finalStyles.codeBlock)}><code>${text}</code></pre>\n`
  }

  renderer.codespan = ({ text }) => {
    return `<code${styleAttribute(finalStyles.codeInline)}>${text}</code>`
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
    return `<img src="${href.replaceAll('"', '&quot;')}" alt="${text.replaceAll('"', '&quot;')}"${
      title ? ` title="${title.replaceAll('"', '&quot;')}"` : ''
    }${styleAttribute(finalStyles.image)}>`
  }

  renderer.link = ({ href, title, tokens }) => {
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
