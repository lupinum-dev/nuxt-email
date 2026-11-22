import type { InjectionKey } from 'vue'
import { camelize, normalizeClass, normalizeStyle } from 'vue'

/**
 * Build-time Tailwind result for one class. Absent fields mean "nothing":
 * no `style` = no inline declarations, no `residual` = drop the class from
 * `class`, no `head` = the class needs no `<head>` rule.
 */
export interface StyleTableEntry {
  /** Kebab-case declarations in Tailwind's order. */
  style?: Record<string, string>
  /** Class name that stays on the element (sanitized for head selectors). */
  residual?: string
  head?: true
  /**
   * Its head rules set only padding. `ESection`, `ERow` and `EContainer` put the
   * residual class on their inner cell, where their padding is.
   */
  cell?: true
}

export interface StyleTable {
  /** In Tailwind's stylesheet order. */
  classes: Record<string, StyleTableEntry>
  /** Head CSS in stylesheet order; an entry is emitted when a render used one of its classes. */
  head: { classes: string[], css: string }[]
}

interface EmailRenderState {
  subject?: string
  text?: string
  /** How many `EEmail` components this render set up; must end at 1. */
  emailCount: number
  readonly usedHeadClasses: Set<string>
  /** Classes the style table does not know; kept verbatim in `class`. */
  readonly unknownClasses: Set<string>
  /** Residual names of `cell` classes, shared by every render of one renderer. */
  readonly cellClasses: ReadonlySet<string>
}

export function createEmailRenderState(cellClasses: ReadonlySet<string> = new Set()): EmailRenderState {
  return { emailCount: 0, usedHeadClasses: new Set(), unknownClasses: new Set(), cellClasses }
}

export const EMAIL_RENDER_STATE: InjectionKey<EmailRenderState> = Symbol('nuxt-email:render-state')

/** Comment content that `EEmail` renders in `<head>`; replaced by {@link fillHead}. */
export const HEAD_PLACEHOLDER = 'nuxt-email-head'

interface LookupEntry extends StyleTableEntry {
  /** Position in the style table, which is Tailwind's stylesheet order. */
  order: number
}

export type StyleLookup = ReadonlyMap<string, LookupEntry>

export function createStyleLookup(table: StyleTable): StyleLookup {
  return new Map(Object.entries(table.classes).map(([name, entry], order) => [name, { ...entry, order }]))
}

/**
 * Set a declaration as the last one, as a later rule would win in a browser: a repeated
 * key moves to the end, so it stays after a shorthand set in between.
 */
function assign(style: Record<string, unknown>, property: string, value: unknown): void {
  if (property in style) Reflect.deleteProperty(style, property)
  style[property] = value
}

function byOrder(left: LookupEntry, right: LookupEntry): number {
  return left.order - right.order
}

/** Residual names that layout components put on their inner cell. */
export function createCellClasses(table: StyleTable): ReadonlySet<string> {
  const names = new Set<string>()
  for (const entry of Object.values(table.classes)) {
    if (entry.cell && entry.residual !== undefined) names.add(entry.residual)
  }
  return names
}

interface ResolvedClassAndStyle {
  class?: string
  style?: Record<string, unknown>
}

/**
 * `forEmailComponent` is set by the transform on registered E* tags. Those
 * components inspect camelCase style keys (`paddingLeft`); native elements and
 * user components get kebab-case keys, which keep vendor prefixes such as
 * `-webkit-` intact in the output.
 */
type Tw = (classes: unknown, style: unknown, forEmailComponent?: boolean) => ResolvedClassAndStyle

const WHITESPACE = /\s+/
const hyphenateCache = new Map<string, string>()
const camelizeCache = new Map<string, string>()

// Same result as Vue's internal `hyphenate`, so author keys match Tailwind's kebab keys.
function hyphenate(key: string): string {
  if (key.startsWith('--')) return key
  let hyphenated = hyphenateCache.get(key)
  if (hyphenated === undefined) {
    hyphenated = key.replace(/\B([A-Z])/g, '-$1').toLowerCase()
    hyphenateCache.set(key, hyphenated)
  }
  return hyphenated
}

// Same keys as `normalizeEmailStyle`, which every E* component applies.
function camelizeKey(key: string): string {
  if (key.startsWith('--')) return key
  let camelized = camelizeCache.get(key)
  if (camelized === undefined) {
    camelized = camelize(key)
    camelizeCache.set(key, camelized)
  }
  return camelized
}

/**
 * The function the template transform calls on every element and component that
 * has a class. Tailwind declarations merge in stylesheet order, as a browser applies
 * the rules, whatever the order in `class`. Author declarations come last, so an author
 * shorthand such as `padding` beats a Tailwind longhand such as `padding-left`.
 */
export function createTw(lookup: StyleLookup, state: EmailRenderState): Tw {
  return (classes, style, forEmailComponent) => {
    const key = forEmailComponent ? camelizeKey : hyphenate
    let styled: LookupEntry[] | undefined
    let sorted = true
    let residual = ''
    for (const token of normalizeClass(classes).split(WHITESPACE)) {
      if (token === '') continue
      const entry = lookup.get(token)
      if (entry === undefined) {
        state.unknownClasses.add(token)
        residual += residual === '' ? token : ` ${token}`
        continue
      }
      if (entry.style !== undefined) {
        if (styled === undefined) styled = [entry]
        else {
          if (entry.order < styled[styled.length - 1]!.order) sorted = false
          styled.push(entry)
        }
      }
      if (entry.residual !== undefined) residual += residual === '' ? entry.residual : ` ${entry.residual}`
      if (entry.head) state.usedHeadClasses.add(token)
    }
    let merged: Record<string, unknown> | undefined
    if (styled !== undefined) {
      if (!sorted) styled.sort(byOrder)
      merged = {}
      for (const entry of styled) {
        for (const property in entry.style) assign(merged, key(property), entry.style[property])
      }
    }
    if (style != null) {
      const author = normalizeStyle([style])
      // An array input always normalizes to an object.
      if (typeof author === 'object') {
        for (const property in author) {
          merged ??= {}
          assign(merged, key(property), author[property])
        }
      }
    }
    const resolved: ResolvedClassAndStyle = {}
    if (residual !== '') resolved.class = residual
    if (merged !== undefined) resolved.style = merged
    return resolved
  }
}

/**
 * Replace the placeholder at the end of `<head>` with the rules of the head classes this
 * render used. The rules go before the first author `<style>` in `<head>`, so author CSS
 * keeps the last word.
 */
export function fillHead(html: string, table: StyleTable, used: ReadonlySet<string>): string {
  const placeholder = `<!--${HEAD_PLACEHOLDER}-->`
  const end = html.indexOf(placeholder)
  if (end === -1) return html
  let css = ''
  if (used.size > 0) {
    for (const rule of table.head) {
      if (rule.classes.some(className => used.has(className))) css += rule.css
    }
  }
  const withoutPlaceholder = html.slice(0, end) + html.slice(end + placeholder.length)
  if (css === '') return withoutPlaceholder
  const firstStyle = html.indexOf('<style', html.indexOf('<head>'))
  const at = firstStyle !== -1 && firstStyle < end ? firstStyle : end
  return `${withoutPlaceholder.slice(0, at)}<style>${css}</style>${withoutPlaceholder.slice(at)}`
}
