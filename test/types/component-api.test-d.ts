import type { EButtonProps } from '../../src/runtime/components/EButton'
import type { EContainerProps } from '../../src/runtime/components/EContainer'
import type { EHeadingProps } from '../../src/runtime/components/EHeading'
import type { EImgProps } from '../../src/runtime/components/EImg'
import type { ELinkProps } from '../../src/runtime/components/ELink'
import type { ERowProps } from '../../src/runtime/components/ERow'
import type { ESectionProps } from '../../src/runtime/components/ESection'

const button: EButtonProps = { href: 'https://example.com' }
const image: EImgProps = { alt: '', src: 'https://example.com/logo.png' }
const link: ELinkProps = { href: 'https://example.com' }
const heading: EHeadingProps = { as: 'h2', style: { marginInline: 'auto' } }

void button
void image
void link
void heading

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

void buttonWithoutHref
void linkWithoutHref
void imageWithoutAccessibilityProps
void reactShapedHeading
void unsafeContainerRole
void unsafeSectionRole
void unsafeRowRole
