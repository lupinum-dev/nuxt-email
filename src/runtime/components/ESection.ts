import type { DefineComponent, TableHTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { layoutTable, useCellClasses } from './layout-table'

export type ESectionProps = Omit<
  SafeEmailAttributes<TableHTMLAttributes>,
  'border' | 'cellpadding' | 'cellspacing' | 'role'
>

export const ESection = defineComponent({
  name: 'ESection',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const cellClasses = useCellClasses()
    return () => {
      const { attributes, tableStyle, cell: cellAttributes } = layoutTable('ESection', attrs, cellClasses)

      return h('table', {
        align: 'center',
        width: '100%',
        border: 0,
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        ...attributes,
        ...(Object.keys(tableStyle).length > 0 ? { style: tableStyle } : {}),
      }, [
        h('tbody', [
          h('tr', [
            h('td', cellAttributes, slots.default?.()),
          ]),
        ]),
      ])
    }
  },
}) as DefineComponent<ESectionProps>
