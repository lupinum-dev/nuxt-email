import type { DefineComponent, TableHTMLAttributes } from 'vue'
import { defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { assertFixedPresentationTable } from './presentation-table'
import { splitTablePadding } from './table-padding'

export type ESectionProps = Omit<
  SafeEmailAttributes<TableHTMLAttributes>,
  'border' | 'cellpadding' | 'cellspacing' | 'role'
>

export const ESection = defineComponent({
  name: 'ESection',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('ESection', attrs)
      assertFixedPresentationTable('ESection', attrs)
      const { style, ...attributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, attributes, style).style
      const { tableStyle, cellStyle } = splitTablePadding(effectiveStyle)

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
            h('td', Object.keys(cellStyle).length > 0 ? { style: cellStyle } : {}, slots.default?.()),
          ]),
        ]),
      ])
    }
  },
}) as DefineComponent<ESectionProps>
