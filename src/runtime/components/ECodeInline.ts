import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { mergeEmailStyles } from './style'

export type ECodeInlineProps = SafeEmailAttributes<HTMLAttributes>

/**
 * Byte-identical to React Email's Orange.fr fix-up `<style>` (see
 * code-inline.tsx). Exported so conformance can assert the exact bytes.
 *
 * On the Orange.fr email client the head/html elements are removed, turning
 * the meta tag into a sibling; the `meta ~` selectors then swap which copy of
 * the children is visible.
 */
export const ORANGE_FR_STYLE = `
        meta ~ .cino {
          display: none !important;
          opacity: 0 !important;
        }

        meta ~ .cio {
          display: block !important;
        }
      `

export const ECodeInline = defineComponent({
  name: 'ECodeInline',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('ECodeInline', attrs)
      const { class: className, style, ...attributes } = attrs
      const userClass = typeof className === 'string' && className ? className : ''
      const codeProps: Record<string, unknown> = {
        ...attributes,
        class: `${userClass} cino`,
      }
      if (style !== undefined) {
        codeProps.style = style
      }

      return [
        h('style', ORANGE_FR_STYLE),
        // Does not render on Orange.fr
        h('code', codeProps, slots.default?.()),
        // Renders only on Orange.fr
        h('span', {
          ...attributes,
          'class': `${userClass} cio`,
          'style': mergeEmailStyles({ display: 'none' }, style),
          'data-skip-in-text': 'true',
        }, slots.default?.()),
      ]
    }
  },
}) as DefineComponent<ECodeInlineProps>
