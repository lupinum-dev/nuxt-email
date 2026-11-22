import { describe, expect, it } from 'vitest'
import { layoutTable } from '../../src/runtime/components/layout-table'

describe('table padding placement', () => {
  it('moves physical padding and cell classes to the cell and leaves the rest on the table', () => {
    expect(layoutTable('ESection', {
      class: 'sm_p-8 brand',
      style: {
        'background-color': 'white',
        'padding': '1px 2px',
        'padding-block': '4px',
        'padding-left': '3px',
      },
    }, new Set(['sm_p-8']))).toEqual({
      attributes: { class: 'brand' },
      tableStyle: {
        backgroundColor: 'white',
        paddingBlock: '4px',
      },
      cell: {
        class: 'sm_p-8',
        style: {
          padding: '1px 2px',
          paddingLeft: '3px',
        },
      },
    })
  })
})
