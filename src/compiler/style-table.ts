import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { TailwindEngineOptions } from './tailwind/index'
import type { StyleTable, StyleTableEntry } from '../runtime/tw'
import { sanitizeClassName } from './tailwind/compatibility/sanitize-class-name'
import { createTailwindEngine } from './tailwind/index'
import { classCandidates } from './candidates'
import { type CssNode, parse, walk } from './css-tree'

/** Optional Tailwind setup for every email (`@theme`, `@utility`); not a template or candidate source. */
export const EMAIL_TAILWIND_CSS = 'tailwind.css'

/** Tailwind options from `<directory>/tailwind.css`, or none when the file does not exist. */
async function readEmailTailwindOptions(directory: string): Promise<TailwindEngineOptions> {
  try {
    return { css: await readFile(join(directory, EMAIL_TAILWIND_CSS), 'utf8') }
  }
  catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return {}
    throw error
  }
}

/** The style table for the class candidates in `files` and the optional `tailwind.css` of `directory`. */
export async function createEmailStyleTable(directory: string, files: readonly string[]): Promise<StyleTable> {
  const sources = await Promise.all([...files].sort().map(file => readFile(file, 'utf8')))
  return createStyleTable(classCandidates(sources), await readEmailTailwindOptions(directory))
}

/** Run Tailwind and the email CSS conversion once for every candidate. */
export async function createStyleTable(
  candidates: string[],
  options: TailwindEngineOptions = {},
): Promise<StyleTable> {
  const engine = await createTailwindEngine(options)
  const computed = engine.computeStyles(candidates)
  const headProperties = headPropertiesByClass(computed.headRules)
  const classes: Record<string, StyleTableEntry> = {}
  // Stylesheet order: the runtime merges an element's declarations in this order, as a browser applies them.
  for (const className of computed.stylesheetOrder) {
    const inline = computed.inlinable.get(className)
    const residual = computed.residualClassMap.get(className)
    const head = computed.headClasses.has(className)
    // Tailwind produced nothing: the runtime keeps unknown classes as they are.
    if (inline === undefined && residual === className && !head) continue
    const properties = headProperties.get(className)
    // A class that sets only custom properties, such as `ring-blue-500`, changes another class's
    // rule. Each class is resolved alone, so it has no effect: keep it in `class`, where the preview lists it.
    if (!inline?.size && (!head || [...properties ?? []].every(property => property.startsWith('--')))) continue
    const entry: StyleTableEntry = {}
    if (inline !== undefined && inline.size > 0) entry.style = Object.fromEntries(inline)
    if (residual !== undefined) entry.residual = residual
    if (head) entry.head = true
    if (head && properties !== undefined && [...properties].every(property => PADDING.test(property))) entry.cell = true
    classes[className] = entry
  }
  // Tailwind writes no CSS for its marker classes, but `group-*` and `peer-*` rules select
  // them: they stay on the element, under the name those rules use (`group/item` is `.group_item`).
  for (const className of candidates) {
    if (MARKER.test(className)) classes[className] = { residual: sanitizeClassName(className) }
  }
  return { classes, head: computed.headRules }
}

const MARKER = /^(?:group|peer)(?:\/[\w-]+)?$/

const PADDING = /^padding(?:-(?:top|right|bottom|left|inline|block)(?:-(?:start|end))?)?$/

/** The properties each class's head rules declare. */
function headPropertiesByClass(rules: readonly { classes: string[], css: string }[]): Map<string, Set<string>> {
  const properties = new Map<string, Set<string>>()
  for (const rule of rules) {
    const declared = new Set<string>()
    walk(parse(rule.css), {
      enter(node: CssNode) {
        if (node.type === 'Declaration') declared.add(node.property)
      },
    })
    for (const className of rule.classes) {
      const own = properties.get(className) ?? new Set()
      for (const property of declared) own.add(property)
      properties.set(className, own)
    }
  }
  return properties
}

/**
 * The table as a JavaScript expression. `JSON.parse` keeps every class an own property
 * (a class named `__proto__` cannot change the prototype) and parses faster
 * than an object literal of the same size.
 */
export function styleTableExpression(table: StyleTable): string {
  return `JSON.parse(${JSON.stringify(JSON.stringify(table))})`
}
