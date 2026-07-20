import type { MarkdownStyle } from './parse-css-in-js-to-inline-css'

// Direct port of react-email's markdown/styles.ts default style map. Values and shapes
// (including the leading space in `background: ' #f8f8f8'`) are reproduced verbatim so the
// serialized inline CSS matches the React oracle byte-for-byte.

const emptyStyle: MarkdownStyle = {}

const baseHeaderStyles = {
  fontWeight: '500',
  paddingTop: 20,
}

const h1: MarkdownStyle = {
  ...baseHeaderStyles,
  fontSize: '2.5rem',
}

const h2: MarkdownStyle = {
  ...baseHeaderStyles,
  fontSize: '2rem',
}

const h3: MarkdownStyle = {
  ...baseHeaderStyles,
  fontSize: '1.75rem',
}

const h4: MarkdownStyle = {
  ...baseHeaderStyles,
  fontSize: '1.5rem',
}

const h5: MarkdownStyle = {
  ...baseHeaderStyles,
  fontSize: '1.25rem',
}

const h6: MarkdownStyle = {
  ...baseHeaderStyles,
  fontSize: '1rem',
}

const bold: MarkdownStyle = {
  fontWeight: 'bold',
}

const italic: MarkdownStyle = {
  fontStyle: 'italic',
}

const blockQuote: MarkdownStyle = {
  background: '#f9f9f9',
  borderLeft: '10px solid #ccc',
  margin: '1.5em 10px',
  padding: '1em 10px',
}

const codeInline: MarkdownStyle = {
  color: '#212529',
  fontSize: '87.5%',
  display: 'inline',
  background: ' #f8f8f8',
  fontFamily: 'SFMono-Regular,Menlo,Monaco,Consolas,monospace',
}

const codeBlock: MarkdownStyle = {
  ...codeInline,
  display: 'block',
  paddingTop: 10,
  paddingRight: 10,
  paddingLeft: 10,
  paddingBottom: 1,
  marginBottom: 20,
  background: ' #f8f8f8',
}

const link: MarkdownStyle = {
  color: '#007bff',
  textDecoration: 'underline',
  backgroundColor: 'transparent',
}

export type StylesType = {
  h1?: MarkdownStyle
  h2?: MarkdownStyle
  h3?: MarkdownStyle
  h4?: MarkdownStyle
  h5?: MarkdownStyle
  h6?: MarkdownStyle
  blockQuote?: MarkdownStyle
  bold?: MarkdownStyle
  italic?: MarkdownStyle
  link?: MarkdownStyle
  codeBlock?: MarkdownStyle
  codeInline?: MarkdownStyle
  p?: MarkdownStyle
  li?: MarkdownStyle
  ul?: MarkdownStyle
  ol?: MarkdownStyle
  image?: MarkdownStyle
  br?: MarkdownStyle
  hr?: MarkdownStyle
  table?: MarkdownStyle
  thead?: MarkdownStyle
  tbody?: MarkdownStyle
  tr?: MarkdownStyle
  th?: MarkdownStyle
  td?: MarkdownStyle
  strikethrough?: MarkdownStyle
}

export const styles: StylesType = {
  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  blockQuote,
  bold,
  italic,
  link,
  codeBlock: { ...codeBlock, wordWrap: 'break-word' },
  codeInline: { ...codeInline, wordWrap: 'break-word' },
  p: emptyStyle,
  li: emptyStyle,
  ul: emptyStyle,
  ol: emptyStyle,
  image: emptyStyle,
  br: emptyStyle,
  hr: emptyStyle,
  table: emptyStyle,
  thead: emptyStyle,
  tbody: emptyStyle,
  th: emptyStyle,
  td: emptyStyle,
  tr: emptyStyle,
  strikethrough: emptyStyle,
}
