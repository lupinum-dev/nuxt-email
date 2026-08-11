import type { EButtonProps } from '../../src/runtime/components/EButton'
import type { EContainerProps } from '../../src/runtime/components/EContainer'
import type { EFontProps } from '../../src/runtime/components/EFont'
import type { EHeadingProps } from '../../src/runtime/components/EHeading'
import type { EImgProps } from '../../src/runtime/components/EImg'
import type { ELinkProps } from '../../src/runtime/components/ELink'
import type { EMarkdownProps } from '../../src/runtime/components/EMarkdown'
import type { ERowProps } from '../../src/runtime/components/ERow'
import type { ESectionProps } from '../../src/runtime/components/ESection'

const button: EButtonProps = { href: 'https://example.com' }
const image: EImgProps = { alt: '', src: 'https://example.com/logo.png' }
const link: ELinkProps = { href: 'https://example.com' }
const heading: EHeadingProps = { as: 'h2', style: { marginInline: 'auto' } }
const font: EFontProps = {
  fallbackFontFamily: ['Georgia', 'serif'],
  fontFamily: 'Roboto',
  fontStyle: 'italic',
  fontWeight: 700,
}
const markdown: EMarkdownProps = {
  class: 'prose',
  source: '# Hello',
  style: [{ padding: '8px' }, 'margin:0'],
}

void button
void image
void link
void heading
void font
void markdown

// @ts-expect-error EButton requires a destination.
const buttonWithoutHref: EButtonProps = {}
// @ts-expect-error ELink requires a destination.
const linkWithoutHref: ELinkProps = {}
// @ts-expect-error EImg requires explicit source and alternative text.
const imageWithoutAccessibilityProps: EImgProps = { src: 'https://example.com/logo.png' }
// @ts-expect-error React Email margin shorthands are not part of the Vue API.
const reactShapedHeading: EHeadingProps = { mx: 4 }
// @ts-expect-error Presentation semantics are fixed by the component.
const unsafeContainerRole: EContainerProps = { role: 'grid' }
// @ts-expect-error Presentation semantics are fixed by the component.
const unsafeSectionRole: ESectionProps = { role: 'grid' }
// @ts-expect-error Presentation semantics are fixed by the component.
const unsafeRowRole: ERowProps = { role: 'grid' }
// @ts-expect-error Fallback arrays must contain at least one font.
const emptyFontFallbacks: EFontProps = { fallbackFontFamily: [], fontFamily: 'Roboto' }
// @ts-expect-error Font style accepts the CSS values the renderer validates.
const unsafeFontStyle: EFontProps = { fallbackFontFamily: 'serif', fontFamily: 'Roboto', fontStyle: '</style>' }
// @ts-expect-error EMarkdown uses Vue's standard style attribute as its one container-style source.
const reactShapedMarkdown: EMarkdownProps = { markdownContainerStyles: { padding: '8px' } }

void buttonWithoutHref
void linkWithoutHref
void imageWithoutAccessibilityProps
void reactShapedHeading
void unsafeContainerRole
void unsafeSectionRole
void unsafeRowRole
void emptyFontFallbacks
void unsafeFontStyle
void reactShapedMarkdown
