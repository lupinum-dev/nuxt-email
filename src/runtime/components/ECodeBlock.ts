import type * as PrismNS from 'prismjs'
import type { DefineComponent, PropType } from 'vue'
import { createRequire } from 'node:module'
import { createStaticVNode, defineComponent } from 'vue'
import { ssrRenderAttrs } from 'vue/server-renderer'
import { assertSafeEmailAttributes } from './attributes'
import type { CodeBlockLanguage } from './code-block-languages'
import type { CodeBlockTheme } from './code-block-themes'
import { normalizeEmailStyle } from './style'

// prismjs and its language loader are CommonJS; `loadLanguages` mutates the
// shared Prism registry via internal `require` calls, so load both through a
// CJS require to preserve those semantics (server-only rendering).
const require = createRequire(import.meta.url)
const Prism = require('prismjs') as typeof PrismNS
const loadLanguages = require('prismjs/components/') as ((languages?: string | string[]) => void) & { silent: boolean }

loadLanguages.silent = true

// React's vendored Prism ships every grammar preloaded, and grammars mutate one
// another when loaded (e.g. `css-extras` teaches `css` to tokenize numbers and
// colors, `js-extras` extends `javascript`). Loading a single language on demand
// would diverge from that fully-populated registry, so we load the whole set
// once — lazily, on first render, to keep module import cheap.
let grammarsLoaded = false
function ensureGrammarsLoaded(): void {
  if (!grammarsLoaded) {
    loadLanguages()
    grammarsLoaded = true
  }
}

export interface ECodeBlockProps {
  code: string
  language: CodeBlockLanguage
  theme: CodeBlockTheme
  lineNumbers?: boolean
  /**
   * Applies a font family to every rendered element, mostly meant to override a
   * global font already set through the `<Font>` component.
   */
  fontFamily?: string
}

type StyleMap = Record<string, string | number | undefined>

// Matches React DOM's `escapeTextForBrowser` byte-for-byte (note `'` -> `&#x27;`,
// which differs from Vue's own `&#39;`), used for both text and attribute values.
const ESCAPE_MAP: Record<string, string> = {
  '"': '&quot;',
  '&': '&amp;',
  '\'': '&#x27;',
  '<': '&lt;',
  '>': '&gt;',
}

function escapeHtml(value: string): string {
  return value.replace(/["'&<>]/g, char => ESCAPE_MAP[char] ?? char)
}

// Matches React's `hyphenateStyleName`: vendor prefixes gain a leading dash
// (`MozTabSize` -> `-moz-tab-size`), unlike Vue's `hyphenate` (`moz-tab-size`).
function hyphenateStyleName(name: string): string {
  return name
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^ms-/, '-ms-')
}

// Serializes a style object the way React DOM's `createMarkupForStyles` does:
// `;`-joined, no trailing delimiter, null/undefined/empty values skipped.
function serializeStyle(style: StyleMap): string {
  let serialized = ''
  let delimiter = ''
  for (const name of Object.keys(style)) {
    const value = style[name]
    if (value === undefined || value === null || value === '') {
      continue
    }
    const property = name.startsWith('--') ? name : hyphenateStyleName(name)
    serialized += `${delimiter}${property}:${String(value).trim()}`
    delimiter = ';'
  }
  return serialized
}

function styleAttribute(style: StyleMap): string {
  const serialized = serializeStyle(style)
  return serialized === '' ? '' : ` style="${escapeHtml(serialized)}"`
}

function stylesForToken(token: PrismNS.Token, theme: CodeBlockTheme): StyleMap {
  let styles: StyleMap = { ...theme[token.type] }
  const aliases = Array.isArray(token.alias) ? token.alias : [token.alias]
  for (const alias of aliases) {
    styles = { ...styles, ...theme[alias] }
  }
  return styles
}

function renderToken(
  token: string | PrismNS.Token,
  theme: CodeBlockTheme,
  inheritedStyle: StyleMap,
): string {
  if (token instanceof Prism.Token) {
    const styleForToken: StyleMap = { ...inheritedStyle, ...stylesForToken(token, theme) }
    const content = token.content

    if (content instanceof Prism.Token) {
      return `<span${styleAttribute(styleForToken)}>${renderToken(content, theme, {})}</span>`
    }
    if (typeof content === 'string') {
      return `<span${styleAttribute(styleForToken)}>${escapeHtml(content)}</span>`
    }
    return content.map(subToken => renderToken(subToken, theme, styleForToken)).join('')
  }

  // Matches React: each space becomes nbsp + zero-width-joiner + zero-width-space.
  return `<span${styleAttribute(inheritedStyle)}>${escapeHtml(token.replaceAll(' ', ' ‍​'))}</span>`
}

export const ECodeBlock = defineComponent({
  name: 'ECodeBlock',
  inheritAttrs: false,
  props: {
    code: { type: String, required: true },
    language: { type: String as PropType<CodeBlockLanguage>, required: true },
    theme: { type: Object as PropType<CodeBlockTheme>, required: true },
    lineNumbers: { type: Boolean, default: false },
    fontFamily: { type: String, default: undefined },
  },
  setup(props, { attrs }) {
    return () => {
      assertSafeEmailAttributes('ECodeBlock', attrs)
      ensureGrammarsLoaded()
      const grammar = Prism.languages[props.language] as PrismNS.Grammar | undefined
      if (grammar === undefined) {
        throw new TypeError(
          `ECodeBlock: There is no language defined on Prism called ${props.language}`,
        )
      }

      const userStyle = normalizeEmailStyle(attrs.style) ?? {}
      const preStyle: StyleMap = { ...props.theme.base, width: '100%', ...userStyle }

      const lines = props.code.split(/\r\n|\r|\n/g)
      let inner = ''
      for (const [lineIndex, line] of lines.entries()) {
        const tokens = Prism.tokenize(line, grammar)

        if (props.lineNumbers) {
          const lineNumberStyle: StyleMap = {
            width: '2em',
            height: '1em',
            display: 'inline-block',
            fontFamily: props.fontFamily,
          }
          inner += `<span${styleAttribute(lineNumberStyle)}>${escapeHtml(String(lineIndex + 1))}</span>`
        }

        for (const token of tokens) {
          inner += renderToken(token, props.theme, { fontFamily: props.fontFamily })
        }
        inner += '<br/>'
      }

      // React spreads `{...rest}` onto the <pre>, so forward the native fall-through
      // attributes (class, id, dir, title, aria-*, data-*, role, ...). `style` is
      // consumed above into preStyle; ssrRenderAttrs drops event handlers/ref exactly
      // as react-dom drops them from HTML, matching how sibling components forward attrs.
      const forwardedAttrs: Record<string, unknown> = { ...attrs }
      delete forwardedAttrs.style
      const html = `<pre${ssrRenderAttrs(forwardedAttrs)}${styleAttribute(preStyle)}><code>${inner}</code></pre>`
      return createStaticVNode(html, 1)
    }
  },
}) as DefineComponent<ECodeBlockProps>
