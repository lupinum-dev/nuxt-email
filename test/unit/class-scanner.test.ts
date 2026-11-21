import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createEmailStyleTable } from '../../src/compiler/style-table'

const directory = fileURLToPath(new URL('../fixtures/class-scanner', import.meta.url))

describe('class scanner', async () => {
  const files = await readdir(directory, { recursive: true, withFileTypes: true })
  const table = await createEmailStyleTable(directory, files.filter(file => file.isFile()).map(file => join(file.parentPath, file.name)))

  it.each([
    ['spaced object key', 'underline'],
    ['compact object key', 'truncate'],
    ['quoted object key', 'font-bold'],
    ['array item', 'italic'],
    ['script constant', 'text-red-500'],
    ['ternary branch', 'uppercase'],
    ['other ternary branch', 'lowercase'],
    ['quoted arbitrary value', 'content-[\'hi\']'],
    ['arbitrary URL', 'bg-[url(\'/x.png\')]'],
    ['variant with quotes', 'before:content-[\'*\']'],
    ['variant', 'sm:p-4'],
    ['arbitrary length', 'w-[10px]'],
    ['opacity modifier', 'bg-black/50'],
    ['arbitrary variant', '[&>p]:m-0'],
    ['class with two bracket groups', '[&_p]:before:content-[\'x\']'],
  ])('finds the class in a %s', (_form, className) => {
    expect(table.classes[className]).toBeDefined()
  })
})
