import type { DefineComponent, TableHTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { assertFixedPresentationTable } from './ERow'
import { splitTablePadding } from './table-padding'

export type EContainerProps = Omit<
  SafeEmailAttributes<TableHTMLAttributes>,
  'border' | 'cellpadding' | 'cellspacing' | 'role'
>

export const EContainer = defineComponent({
  name: 'EContainer',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => {
      assertSafeEmailAttributes('EContainer', attrs)
      assertFixedPresentationTable('EContainer', attrs)
      const { style, ...attributes } = attrs
      const { tableStyle, cellStyle } = splitTablePadding(style)

      return h('table', {
        align: 'center',
        width: '100%',
        ...attributes,
        border: 0,
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        style: { maxWidth: '37.5em', ...tableStyle },
      }, [
        h('tbody', [
          h('tr', { style: { width: '100%' } }, [
            h('td', Object.keys(cellStyle).length > 0 ? { style: cellStyle } : {}, slots.default?.()),
          ]),
        ]),
      ])
    }
  },
}) as DefineComponent<EContainerProps>
