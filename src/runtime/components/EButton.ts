import type { AnchorHTMLAttributes, DefineComponent } from 'vue'
import { createCommentVNode, defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { parseButtonPadding, pixelsToPoints, pixelStyle } from './button-padding'
import { normalizeEmailStyle } from './style'

export type EButtonProps = Omit<SafeEmailAttributes<AnchorHTMLAttributes>, 'href'> & {
  href: string
}

const MAX_MSO_FONT_WIDTH = 5
const MAX_MSO_SPACE_COUNT = 1000

/**
 * Outlook spacing behavior adapted from React Email's MIT-licensed Button.
 * Copyright 2024 Plus Five Five, Inc; pinned source commit 6eb428924c4c2774228a07cbec1977ad8898f143.
 */
export function computeMsoFontWidthAndSpaceCount(expectedWidth: number): readonly [number, number] {
  if (!Number.isFinite(expectedWidth)) {
    throw new TypeError(`EButton padding must resolve to finite pixels; received ${String(expectedWidth)}`)
  }
  if (expectedWidth === 0) {
    return [0, 0]
  }
  if (expectedWidth < 0) {
    throw new TypeError(`EButton padding must be a finite non-negative value; received ${String(expectedWidth)}`)
  }

  const spaceCount = Math.max(1, Math.ceil(expectedWidth / (MAX_MSO_FONT_WIDTH * 2)))
  if (spaceCount > MAX_MSO_SPACE_COUNT) {
    throw new TypeError(
      `EButton horizontal padding requires ${spaceCount} Outlook spacer characters; maximum is ${MAX_MSO_SPACE_COUNT}`,
    )
  }
  return [expectedWidth / spaceCount / 2, spaceCount]
}

export const EButton = defineComponent({
  name: 'EButton',
  inheritAttrs: false,
  props: {
    href: {
      type: String,
      required: true,
    },
  },
  setup(props, { attrs, slots }) {
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('EButton', attrs)
      if (typeof props.href !== 'string' || props.href.length === 0) {
        throw new TypeError('EButton href must be a non-empty string')
      }
      const { style, target: requestedTarget, ...attributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, attributes, style).style
      const normalizedStyle = normalizeEmailStyle(effectiveStyle) ?? {}
      const { paddingTop, paddingRight, paddingBottom, paddingLeft } = parseButtonPadding(normalizedStyle)
      const textRaise = pixelsToPoints((paddingTop ?? 0) + (paddingBottom ?? 0))
      const [leftFontWidth, leftSpaceCount] = computeMsoFontWidthAndSpaceCount(paddingLeft ?? 0)
      const [rightFontWidth, rightSpaceCount] = computeMsoFontWidthAndSpaceCount(paddingRight ?? 0)
      const target = requestedTarget ?? '_blank'

      return h('a', {
        ...attributes,
        href: props.href,
        style: {
          lineHeight: '100%',
          textDecoration: 'none',
          display: 'inline-block',
          maxWidth: '100%',
          msoPaddingAlt: '0px',
          ...normalizedStyle,
          paddingTop: pixelStyle(paddingTop),
          paddingRight: pixelStyle(paddingRight),
          paddingBottom: pixelStyle(paddingBottom),
          paddingLeft: pixelStyle(paddingLeft),
        },
        target,
      }, [
        h('span', [
          createCommentVNode(
            `[if mso]><i style="mso-font-width:${leftFontWidth * 100}%;mso-text-raise:${textRaise}px" hidden>${'&#8202;'.repeat(leftSpaceCount)}</i><![endif]`,
          ),
        ]),
        h('span', {
          style: {
            maxWidth: '100%',
            display: 'inline-block',
            lineHeight: '120%',
            msoPaddingAlt: '0px',
            msoTextRaise: pixelStyle(pixelsToPoints(paddingBottom)),
          },
        }, slots.default?.()),
        h('span', [
          createCommentVNode(
            `[if mso]><i style="mso-font-width:${rightFontWidth * 100}%" hidden>${'&#8202;'.repeat(rightSpaceCount)}&#8203;</i><![endif]`,
          ),
        ]),
      ])
    }
  },
}) as DefineComponent<EButtonProps>
