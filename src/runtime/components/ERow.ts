import type { DefineComponent, TableHTMLAttributes } from 'vue'
import { defineComponent, h } from 'vue'
import type { SafeEmailAttributes } from './attributes'
import { layoutTable, useCellClasses } from './layout-table'

export type ERowProps = Omit<
  SafeEmailAttributes<TableHTMLAttributes>,
  'border' | 'cellpadding' | 'cellspacing' | 'role'
>

export const ERow = defineComponent({
  name: 'ERow',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const cellClasses = useCellClasses()
    return () => {
      const { attributes, tableStyle, cell: cellAttributes } = layoutTable('ERow', attrs, cellClasses)

      const tableAttributes = {
        align: 'center',
        width: '100%',
        border: 0,
        cellpadding: '0',
        cellspacing: '0',
        role: 'presentation',
        ...attributes,
        ...(Object.keys(tableStyle).length > 0 ? { style: tableStyle } : {}),
      }
      const rowContent = [
        h('tbody', { style: { width: '100%' } }, [
          h('tr', { style: { width: '100%' } }, slots.default?.()),
        ]),
      ]

      if (Object.keys(cellAttributes).length === 0) {
        return h('table', tableAttributes, rowContent)
      }

      return h('table', tableAttributes, [
        h('tbody', [
          h('tr', [
            h('td', cellAttributes, [
              h('table', {
                align: 'center',
                width: '100%',
                border: 0,
                cellpadding: '0',
                cellspacing: '0',
                role: 'presentation',
              }, rowContent),
            ]),
          ]),
        ]),
      ])
    }
  },
}) as DefineComponent<ERowProps>
