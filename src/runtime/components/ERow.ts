import type { DefineComponent, TableHTMLAttributes } from 'vue'
import { defineComponent, h, inject } from 'vue'
import { resolveNestedTailwindStyle, TAILWIND_NESTED_KEY } from '../tailwind/nested'
import type { SafeEmailAttributes } from './attributes'
import { assertSafeEmailAttributes } from './attributes'
import { splitTablePadding } from './table-padding'

const FIXED_PRESENTATION_TABLE_ATTRIBUTES = new Set(['border', 'cellpadding', 'cellspacing', 'role'])

/**
 * The presentation-table primitives (ERow, ESection, EContainer) hard-code
 * border, cellpadding, cellspacing, and role to keep the email-client-safe
 * layout invariant. React Email lets callers override them (props spread after
 * the defaults); nuxt-email throws instead of silently discarding the override.
 */
export function assertFixedPresentationTable(
  componentName: string,
  attributes: Readonly<Record<string, unknown>>,
): void {
  const overrides = Object.keys(attributes).filter(
    name => FIXED_PRESENTATION_TABLE_ATTRIBUTES.has(name.toLowerCase()),
  )

  if (overrides.length > 0) {
    throw new TypeError(
      `${componentName} does not allow overriding fixed presentation-table attribute${overrides.length === 1 ? '' : 's'}: ${overrides.join(', ')}; border, cellpadding, cellspacing, and role are fixed to preserve the email-client-safe table layout`,
    )
  }
}

export type ERowProps = Omit<
  SafeEmailAttributes<TableHTMLAttributes>,
  'border' | 'cellpadding' | 'cellspacing' | 'role'
>

export const ERow = defineComponent({
  name: 'ERow',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    const holder = inject(TAILWIND_NESTED_KEY, null)
    return () => {
      assertSafeEmailAttributes('ERow', attrs)
      assertFixedPresentationTable('ERow', attrs)
      const { style, ...attributes } = attrs
      const effectiveStyle = resolveNestedTailwindStyle(holder, attributes, style).style
      const { tableStyle, cellStyle } = splitTablePadding(effectiveStyle)

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

      if (Object.keys(cellStyle).length === 0) {
        return h('table', tableAttributes, rowContent)
      }

      return h('table', tableAttributes, [
        h('tbody', [
          h('tr', [
            h('td', { style: cellStyle }, [
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
