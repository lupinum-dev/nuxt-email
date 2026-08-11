import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { normalizeEmailStyle } from './style'

export type EBodyProps = SafeEmailAttributes<HTMLAttributes>

const RESET_PROPERTIES = [
  'margin',
  'marginTop',
  'marginBottom',
  'marginRight',
  'marginLeft',
  'marginInline',
  'marginBlock',
  'marginBlockStart',
  'marginBlockEnd',
  'marginInlineStart',
  'marginInlineEnd',
  'padding',
  'paddingTop',
  'paddingBottom',
  'paddingRight',
  'paddingLeft',
  'paddingInline',
  'paddingBlock',
  'paddingBlockStart',
  'paddingBlockEnd',
  'paddingInlineStart',
  'paddingInlineEnd',
] as const

export const EBody = defineComponent({
  name: 'EBody',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('EBody', attrs)
      const { style, ...bodyAttributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, bodyAttributes, style).style
      const normalizedStyle = normalizeEmailStyle(effectiveStyle)
      const hasUserStyle = normalizedStyle !== undefined && Object.keys(normalizedStyle).length > 0
      const dir = attrs.dir ?? 'ltr'
      const lang = attrs.lang ?? 'en'
      const bodyStyle: Record<string, string | number | undefined> = {}

      if (hasUserStyle) {
        bodyStyle.background = normalizedStyle.background
        bodyStyle.backgroundColor = normalizedStyle.backgroundColor
        for (const property of RESET_PROPERTIES) {
          if (normalizedStyle[property] !== undefined) {
            bodyStyle[property] = 0
          }
        }
      }

      return h('body', {
        ...bodyAttributes,
        dir,
        lang,
        ...(Object.values(bodyStyle).some(value => value !== undefined) ? { style: bodyStyle } : {}),
      }, [
        h('table', {
          border: 0,
          width: '100%',
          cellpadding: '0',
          cellspacing: '0',
          role: 'presentation',
          align: 'center',
        }, [
          h('tbody', [
            h('tr', [
              h('td', { dir, lang, ...(hasUserStyle ? { style: effectiveStyle } : {}) }, slots.default?.()),
            ]),
          ]),
        ]),
      ])
    }
  },
}) as DefineComponent<EBodyProps>
