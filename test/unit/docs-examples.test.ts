import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { compileEmailDirectory } from '../../src/compiler/build-templates'

const root = fileURLToPath(new URL('../..', import.meta.url))
const directory = join(root, '.tmp/tests/docs-examples')

async function markdownFiles(folder: string): Promise<string[]> {
  const entries = await readdir(folder, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? markdownFiles(join(folder, entry.name))
    : entry.name.endsWith('.md') ? [join(folder, entry.name)] : []))
  return nested.flat()
}

/** Every `vue` code block of a Markdown file, with the line where it starts. */
function vueBlocks(markdown: string): { line: number, code: string }[] {
  const lines = markdown.split('\n')
  const blocks: { line: number, code: string }[] = []
  for (let index = 0; index < lines.length; index++) {
    const indent = /^(\s*)```vue\b/.exec(lines[index]!)?.[1]
    if (indent === undefined) continue
    const start = index + 1
    while (index + 1 < lines.length && !/^\s*```\s*$/.test(lines[index + 1]!)) index++
    blocks.push({ line: start + 1, code: lines.slice(start, index + 1).map(line => line.slice(indent.length)).join('\n') })
  }
  return blocks
}

// A complete template in the docs must still compile: an example with a removed component,
// a wrong prop syntax or an unknown tag is what a user copies first. Examples of the old
// API (the migration page) and examples that import files of an application are left out.
it('compiles every complete email template in the README and the docs', async () => {
  await rm(directory, { recursive: true, force: true })
  await mkdir(directory, { recursive: true })
  const names: string[] = []
  for (const file of [join(root, 'README.md'), ...await markdownFiles(join(root, 'docs/content'))]) {
    for (const { line, code } of vueBlocks(await readFile(file, 'utf8'))) {
      if (!code.includes('<EEmail') || code.includes('<ETailwind') || /^\s*import .* from ['"][.~]/m.test(code)) continue
      const name = `${relative(root, file).replace(/\W+/g, '-')}-${line}`
      names.push(name)
      await writeFile(join(directory, `${name}.vue`), code.includes('<template>') ? code : `<template>\n${code}\n</template>\n`)
    }
  }
  // An example that loses its `EEmail` root is skipped above, so the two entry examples are named.
  expect(names.length).toBeGreaterThan(5)
  expect(names.filter(name => /^(?:README-md|docs-content-docs-1-getting-started-4-first-email-md)-/.test(name))).toHaveLength(2)
  const { code } = await compileEmailDirectory({ directory })
  for (const name of names) expect(code).toContain(JSON.stringify(name))
}, 30_000)
