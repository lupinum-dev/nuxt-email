import { generate, parse, type StyleSheet } from 'css-tree'
import { describe, expect, it } from 'vitest'
import { resolveVariables } from '../../../src/compiler/tailwind/css/resolve-variables'

function resolved(css: string): string {
  const styleSheet = parse(css) as StyleSheet
  resolveVariables(styleSheet)
  return generate(styleSheet)
}

describe('resolveVariables()', () => {
  it.each([
    {
      name: 'a value in the same rule',
      css: '.btn{--bg:#3490dc;background-color:var(--bg)}',
      expected: '.btn{--bg:#3490dc;background-color:#3490dc}',
    },
    {
      name: 'a value from :root, such as @theme in app/emails/tailwind.css',
      css: ':root,:host{--color-brand:#00dc82}.bg-brand{background-color:var(--color-brand)}',
      expected: ':root,:host{--color-brand:#00dc82}.bg-brand{background-color:#00dc82}',
    },
    {
      name: 'the @property initial value before the fallback',
      css: '@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}.border{border-style:var(--tw-border-style,dashed)}',
      expected: '@property --tw-border-style{syntax:"*";inherits:false;initial-value:solid}.border{border-style:solid}',
    },
    {
      name: 'nested fallbacks',
      css: '.a{color:var(--x,var(--y,rgb(0 0 0/0.1)))}',
      expected: '.a{color:rgb(0 0 0/0.1)}',
    },
    {
      name: 'values that use other variables',
      css: '.ring{--tw-ring-shadow:0 0 0 calc(2px + var(--tw-ring-offset-width,0px)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-ring-shadow)}',
      expected: '.ring{--tw-ring-shadow:0 0 0 calc(2px + var(--tw-ring-offset-width,0px)) var(--tw-ring-color,currentcolor);box-shadow:0 0 0 calc(2px + 0px) currentcolor}',
    },
    {
      name: 'empty fallbacks of variant stacking',
      css: '.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,)}',
      expected: '.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:tabular-nums}',
    },
    {
      name: 'nothing for a name without any value',
      css: '.a{color:var(--missing)}',
      expected: '.a{color:var(--missing)}',
    },
    {
      name: 'nothing for a cycle',
      css: '.a{--x:var(--y);--y:var(--x);color:var(--x)}',
      expected: '.a{--x:var(--y);--y:var(--x);color:var(--x)}',
    },
    {
      name: 'only values of its own rule',
      css: '.a{--x:red}.b{color:var(--x,blue)}',
      expected: '.a{--x:red}.b{color:blue}',
    },
  ])('resolves $name', ({ css, expected }) => {
    expect(resolved(css)).toBe(expected)
  })
})
