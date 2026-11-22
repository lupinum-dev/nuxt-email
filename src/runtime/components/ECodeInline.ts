import type { DefineComponent, HTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { trimSlotEdges } from './slot-text'

type ECodeInlineProps = SafeEmailAttributes<HTMLAttributes>

/**
 * Byte-identical to React Email's Orange.fr fix-up `<style>` (see
 * code-inline.tsx).
 *
 * On the Orange.fr email client the head/html elements are removed, turning
 * the meta tag into a sibling; the `meta ~` selectors then swap which copy of
 * the children is visible.
 */
const ORANGE_FR_STYLE = `
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
      const userClass = typeof className === 'string' && className ? `${className} ` : ''
      const codeProps: Record<string, unknown> = {
        ...attributes,
        class: `${userClass}cino`,
      }
      if (style !== undefined) {
        codeProps.style = style
      }

      return [
        h('style', ORANGE_FR_STYLE),
        // Does not render on Orange.fr
        h('code', codeProps, trimSlotEdges(slots.default?.())),
        // Renders only on Orange.fr
        h('span', {
          ...attributes,
          'class': `${userClass}cio`,
          // The author style may set `display`; this copy must stay hidden outside Orange.fr.
          'style': [style, { display: 'none' }],
          'data-skip-in-text': 'true',
        }, trimSlotEdges(slots.default?.())),
      ]
    }
  },
}) as DefineComponent<ECodeInlineProps>
