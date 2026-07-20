import type { DefineComponent, TableHTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'

export type ERowProps = SafeEmailAttributes<TableHTMLAttributes>

export const ERow = defineComponent({
  name: 'ERow',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('ERow', attrs)

      return h('table', {
        align: 'center',
        width: '100%',
        border: 0,
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        ...attrs,
      }, [
        h('tbody', { style: { width: '100%' } }, [
          h('tr', { style: { width: '100%' } }, slots.default?.()),
        ]),
      ])
    }
  },
}) as DefineComponent<ERowProps>
