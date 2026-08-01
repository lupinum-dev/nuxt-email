import type { ThemedToken, TokensResult } from '@shikijs/core'
import type { DefineComponent, HTMLAttributes, PropType, VNodeChild } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from '../components/attributes'
import { assertSafeEmailAttributes } from '../components/attributes'
import type { EmailStyle } from '../components/style'
import { mergeEmailStyles } from '../components/style'

export type ECodeBlockProps<Language extends string> = {
  code: string
  language: Language
  lineNumbers?: boolean
  fontFamily?: string
} & SafeEmailAttributes<HTMLAttributes>

interface CodeBlockComponentOptions<Language extends string> {
  enabledLanguages: readonly Language[]
  theme: string
  highlight: (code: string, language: Language) => Promise<TokensResult>
}

const FONT_STYLE_ITALIC = 1
const FONT_STYLE_BOLD = 2
const FONT_STYLE_UNDERLINE = 4
const FONT_STYLE_STRIKETHROUGH = 8

function tokenStyle(token: ThemedToken): EmailStyle {
  if (token.htmlStyle !== undefined) {
    return { ...token.htmlStyle }
  }

  const style: EmailStyle = {
    color: token.color,
    backgroundColor: token.bgColor,
  }
  const fontStyle = token.fontStyle ?? 0
  if (fontStyle > 0) {
    if ((fontStyle & FONT_STYLE_ITALIC) !== 0) {
      style.fontStyle = 'italic'
    }
    if ((fontStyle & FONT_STYLE_BOLD) !== 0) {
      style.fontWeight = 'bold'
    }

    const decorations: string[] = []
    if ((fontStyle & FONT_STYLE_UNDERLINE) !== 0) {
      decorations.push('underline')
    }
    if ((fontStyle & FONT_STYLE_STRIKETHROUGH) !== 0) {
      decorations.push('line-through')
    }
    if (decorations.length > 0) {
      style.textDecoration = decorations.join(' ')
    }
  }
  return style
}

function renderTokens(tokens: readonly (readonly ThemedToken[])[], lineNumbers: boolean): VNodeChild[] {
  const children: VNodeChild[] = []
  const lineNumberWidth = `${String(tokens.length).length + 1}ch`

  for (const [lineIndex, line] of tokens.entries()) {
    if (lineNumbers) {
      children.push(h('span', {
        'aria-hidden': 'true',
        'data-skip-in-text': 'true',
        'style': {
          display: 'inline-block',
          userSelect: 'none',
          width: lineNumberWidth,
        },
      }, String(lineIndex + 1)))
    }
    for (const token of line) {
      children.push(h('span', { style: tokenStyle(token) }, token.content))
    }
    if (lineIndex < tokens.length - 1) {
      children.push('\n')
    }
  }

  return children
}

export function createCodeBlockComponent<const Language extends string>(
  options: CodeBlockComponentOptions<Language>,
): DefineComponent<ECodeBlockProps<Language>> {
  const enabledLanguages = new Set<string>(options.enabledLanguages)

  return defineComponent({
    name: 'ECodeBlock',
    inheritAttrs: false,
    props: {
      code: { type: String, required: true },
      language: { type: String as unknown as PropType<Language>, required: true },
      lineNumbers: { type: Boolean, default: false },
      fontFamily: { type: String, default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
    },
    async setup(props, { attrs }) {
      assertSafeEmailAttributes('ECodeBlock', attrs)
      const language = props.language as unknown as Language
      if (!enabledLanguages.has(language)) {
        throw new TypeError(
          `ECodeBlock language ${JSON.stringify(language)} is not enabled. Enabled languages: ${options.enabledLanguages.join(', ')}`,
        )
      }

      const highlighted = await options.highlight(props.code, language)

      return () => {
        const { class: className, style, ...attributes } = attrs
        const preStyle: EmailStyle = {
          backgroundColor: highlighted.bg,
          color: highlighted.fg,
          fontFamily: props.fontFamily,
          margin: 0,
          overflowWrap: 'break-word',
          whiteSpace: 'pre-wrap',
        }

        return h('pre', {
          ...attributes,
          'class': className,
          'data-code-theme': options.theme,
          'style': mergeEmailStyles(preStyle, style),
          'tabindex': attributes.tabindex ?? 0,
        }, [
          h('code', { style: { fontFamily: props.fontFamily } }, renderTokens(
            highlighted.tokens,
            props.lineNumbers === true,
          )),
        ])
      }
    },
  }) as unknown as DefineComponent<ECodeBlockProps<Language>>
}
