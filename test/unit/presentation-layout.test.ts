import { describe, expect, it } from 'vitest'
import { splitTablePadding } from '../../src/runtime/components/table-padding'

describe('table padding placement', () => {
  it('moves physical padding to the cell and leaves other styles on the table', () => {
    expect(splitTablePadding({
      'background-color': 'white',
      'padding': '1px 2px',
      'padding-block': '4px',
      'padding-left': '3px',
    })).toEqual({
      tableStyle: {
        backgroundColor: 'white',
        paddingBlock: '4px',
      },
      cellStyle: {
        padding: '1px 2px',
        paddingLeft: '3px',
      },
    })
  })
})
