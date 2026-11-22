import { compileTemplate } from 'vue/compiler-sfc'
import { describe, expect, it } from 'vitest'
import { createTailwindTransform } from '../../src/compiler/transform'

function compile(source: string): string {
  const { code, errors } = compileTemplate({
    source,
    filename: 'email.vue',
    id: 'email',
    compilerOptions: { nodeTransforms: [createTailwindTransform()] },
  })
  expect(errors).toEqual([])
  return code
}

describe('createTailwindTransform', () => {
  it.each([
    ['static class', '<p class="p-4 text-sm">x</p>', '_ctx._tw("p-4 text-sm", undefined)'],
    ['dynamic class', '<p :class="{ \'font-bold\': strong }">x</p>', '_ctx._tw(({ \'font-bold\': _ctx.strong }), undefined)'],
    ['static and dynamic class', '<p class="p-4" :class="tone">x</p>', '_ctx._tw(["p-4", (_ctx.tone)], undefined)'],
    ['class and style', '<p class="p-4" style="color: red">x</p>', '_ctx._tw("p-4", ({"color":"red"}))'],
    ['class and dynamic style', '<p class="p-4" :style="{ color }">x</p>', '_ctx._tw("p-4", ({ color: _ctx.color }))'],
    ['email component tag', '<EText class="m-0">x</EText>', '_ctx._tw("m-0", undefined, true)'],
    ['kebab-case email component tag', '<e-text class="m-0">x</e-text>', '_ctx._tw("m-0", undefined, true)'],
    ['v-for scope', '<p v-for="item in items" :class="item.tone">x</p>', '_ctx._tw((item.tone), undefined)'],
  ])('%s', (_name, source, expected) => {
    expect(compile(source)).toContain(expected)
  })

  it('leaves an element without a class untouched', () => {
    const code = compile('<p style="color: red" :title="label">x</p>')
    expect(code).not.toContain('_tw')
    expect(code).toContain('style: {"color":"red"}')
  })
})
