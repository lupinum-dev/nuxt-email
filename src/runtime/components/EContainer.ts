import type { DefineComponent, TableHTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { layoutTable, useCellClasses } from './layout-table'

export type EContainerProps = Omit<
  SafeEmailAttributes<TableHTMLAttributes>,
  'border' | 'cellpadding' | 'cellspacing' | 'role'
>

export const EContainer = defineComponent({
  name: 'EContainer',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const cellClasses = useCellClasses()
    return () => {
      const { attributes, tableStyle, cell: cellAttributes } = layoutTable('EContainer', attrs, cellClasses)

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
            h('td', cellAttributes, slots.default?.()),
          ]),
        ]),
      ])
    }
  },
}) as DefineComponent<EContainerProps>
