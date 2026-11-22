import { describe, expect, it } from 'vitest'
import { generate, parse, type StyleSheet } from '../../../src/compiler/css-tree'
import { physicalDeclarations } from '../../../src/compiler/tailwind/css/physical-properties'

function physical(css: string): string {
  const sheet = parse(`.x{${css}}`) as StyleSheet
  let result = ''
  sheet.children.forEach((rule) => {
    if (rule.type !== 'Rule') return
    rule.block.children.forEach((node) => {
      if (node.type !== 'Declaration') return
      result = (physicalDeclarations(node) ?? [node]).map(declaration => generate(declaration)).join(';')
    })
  })
  return result
}

// Email clients read logical properties poorly; generated CSS uses the sides of a left-to-right email.
describe('physicalDeclarations()', () => {
  it.each([
    ['padding-inline-start:16px', 'padding-left:16px'],
    ['margin-inline-end:8px', 'margin-right:8px'],
    ['margin-block-start:4px!important', 'margin-top:4px!important'],
    ['inset-inline:0', 'left:0;right:0'],
    ['inset-block-end:0', 'bottom:0'],
    ['margin-inline:0 auto', 'margin-left:0;margin-right:auto'],
    ['padding-block:10px 20%', 'padding-top:10px;padding-bottom:20%'],
    ['padding-inline:10px calc(1rem + 2px)', 'padding-left:10px;padding-right:calc(1rem + 2px)'],
    ['margin-block:8px', 'margin-top:8px;margin-bottom:8px'],
    ['border-inline-width:1px', 'border-left-width:1px;border-right-width:1px'],
    ['border-inline:1px solid red', 'border-left:1px solid red;border-right:1px solid red'],
    ['border-inline-start-color:red', 'border-left-color:red'],
    ['border-start-start-radius:8px', 'border-top-left-radius:8px'],
    ['border-end-start-radius:8px', 'border-bottom-left-radius:8px'],
    ['text-align:start', 'text-align:left'],
    ['text-align:center', 'text-align:center'],
    ['float:inline-end', 'float:right'],
    ['clear:inline-start', 'clear:left'],
    ['scroll-margin-inline-start:8px', 'scroll-margin-left:8px'],
    ['contain-intrinsic-block-size:10px', 'contain-intrinsic-block-size:10px'],
    ['display:inline-block', 'display:inline-block'],
  ])('%s', (input, expected) => {
    expect(physical(input)).toBe(expected)
  })
})
