import type { ComputedStyles } from './engine/index'
import type { Component, VNode, VNodeArrayChildren, VNodeChild } from 'vue'
import { camelize, Comment, Fragment, h, isVNode, normalizeClass, Static, Text } from 'vue'
import { EHead } from '../components/EHead'
import { normalizeEmailStyle } from '../components/style'

/**
 * Render-time Tailwind inlining over the ETailwind slot's VNode tree.
 *
 * This is a faithful port of React Email's `<Tailwind>` algorithm
 * (`mapReactTree` + `cloneElementWithInlinedStyles`), NOT a post-render string
 * transform. The reason is behavioural: React Email inlines a class's utilities
 * into each element's *style prop* and then lets the element (e.g. Text, Section,
 * Button) run its own style logic on top of that input. nuxt-email's primitives
 * are faithful ports that do the same (Text re-splits margins, Section splits
 * padding to its `<td>`, Button derives Outlook spacer widths from its padding).
 * Feeding the Tailwind styles into the primitive's style prop *before* it renders
 * reproduces React byte-for-byte; a transform that runs *after* the primitive has
 * already rendered cannot. Working on the VNode tree also leaves every byte we do
 * not touch — MSO conditional comments included — completely untouched.
 *
 * Precedence falls out for free and matches React's `{ ...twStyle, ...authorStyle }`:
 * component hard defaults < tailwind < author style, because we hand the primitive
 * `{ ...tailwind, ...author }` as its style input and the primitive spreads its own
 * defaults underneath.
 */

type Props = Record<string, unknown>
type SlotFn = (...args: unknown[]) => unknown
type Slots = Record<string, SlotFn>

/**
 * Thrown when a Tailwind region produces rules that must live in a `<head>`
 * (media queries / pseudo-classes) but no `<head>` exists inside it. The message
 * is byte-identical to React Email's error so conformance can assert on it.
 */
export class TailwindMissingHeadError extends Error {
  constructor(nonInlinableClassNames: string[]) {
    super(
      `Tailwind: <head> not found inside <Tailwind>.\n`
      + `Move <Head /> inside <Tailwind>, or remove these classes that require a <head>: `
      + `${nonInlinableClassNames.join(' ')}.`,
    )
    this.name = 'TailwindMissingHeadError'
  }
}

function isHeadVNode(node: VNode): boolean {
  return node.type === EHead || node.type === 'head'
}

function toArray(children: unknown): unknown[] {
  if (children == null || children === false || children === true) return []
  return Array.isArray(children) ? children : [children]
}

function classTokens(rawClass: unknown): string[] {
  if (rawClass == null) return []
  return normalizeClass(rawClass).split(/\s+/).filter(token => token.length > 0)
}

/**
 * Walk the slot VNode tree once, collecting every class token (in first-seen tree
 * order, duplicates kept — matching React's `classesUsed`) and recording whether a
 * `<head>` exists anywhere inside the region.
 */
export function scanTailwindTree(children: unknown): { classNames: string[], hasHead: boolean } {
  const classNames: string[] = []
  let hasHead = false

  const visit = (nodes: unknown): void => {
    for (const node of toArray(nodes)) {
      if (Array.isArray(node)) {
        visit(node)
        continue
      }
      if (!isVNode(node)) continue
      if (isHeadVNode(node)) hasHead = true

      const props = (node.props ?? {}) as Props
      classNames.push(...classTokens(props.class))

      const child = node.children
      if (typeof child === 'string') continue
      if (Array.isArray(child)) {
        visit(child)
      }
      else if (child && typeof child === 'object') {
        for (const [key, slot] of Object.entries(child as Record<string, unknown>)) {
          if (key.startsWith('_') || key === '$stable') continue
          if (typeof slot === 'function') visit((slot as SlotFn)())
        }
      }
    }
  }

  visit(children)
  return { classNames, hasHead }
}

/**
 * Original (unsanitized) names of the classes that produced non-inlinable rules,
 * in first-seen order — the list React interpolates into its no-`<head>` error.
 * A class is non-inlinable exactly when its residual output differs from the
 * original (sanitizeClassName rewrites the `:` / `/` that every variant class
 * carries); unknown classes map to themselves and are excluded.
 */
export function nonInlinableClassNames(computed: ComputedStyles): string[] {
  const names: string[] = []
  for (const [original, output] of computed.residualClassMap) {
    if (output !== original) names.push(original)
  }
  return names
}

/** Merge the inlinable declarations of an element's classes, in class order. */
function tailwindStyleFor(tokens: string[], computed: ComputedStyles): Map<string, string> {
  const merged = new Map<string, string>()
  for (const token of tokens) {
    const declarations = computed.inlinable.get(token)
    if (!declarations) continue
    for (const [property, value] of declarations) {
      merged.set(property, value)
    }
  }
  return merged
}

/** Residual classes to keep on the element, original class order preserved. */
function residualClassesFor(tokens: string[], computed: ComputedStyles): string[] {
  const residual: string[] = []
  for (const token of tokens) {
    const output = computed.residualClassMap.get(token)
    if (output !== undefined) residual.push(output)
  }
  return residual
}

/**
 * Compute the replacement props for an element/component that carries a `class`.
 * Mirrors `cloneElementWithInlinedStyles`: build `{ ...tailwind, ...author }` as the
 * style, and keep only residual (non-inlinable / unknown) classes.
 */
function inlineProps(props: Props, computed: ComputedStyles): Props {
  const tokens = classTokens(props.class)
  const tailwind = tailwindStyleFor(tokens, computed)
  const residual = residualClassesFor(tokens, computed)

  const next: Props = {}
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class' || key === 'style') continue
    next[key] = value
  }

  if (tailwind.size > 0) {
    const style: Record<string, string | number> = {}
    for (const [property, value] of tailwind) {
      style[camelize(property)] = value
    }
    const author = normalizeEmailStyle(props.style)
    if (author) {
      for (const [property, value] of Object.entries(author)) {
        if (value !== undefined) style[property] = value
      }
    }
    next.style = style
  }
  else if (props.style !== undefined) {
    next.style = props.style
  }

  if (residual.length > 0) next.class = residual.join(' ')

  return next
}

function injectHeadStyle(children: VNodeChild[], injectedStyle: VNode): VNodeChild[] {
  const styleIndex = children.findIndex(child => isVNode(child) && child.type === 'style')
  const result = [...children]
  if (styleIndex === -1) result.push(injectedStyle)
  else result.splice(styleIndex, 0, injectedStyle)
  return result
}

interface TransformContext {
  computed: ComputedStyles
  injectedStyle: VNode
}

function transformChild(node: unknown, ctx: TransformContext): VNodeChild {
  if (Array.isArray(node)) {
    return node.map(child => transformChild(child, ctx)) as VNodeArrayChildren
  }
  if (!isVNode(node)) return node as VNodeChild
  return transformVNode(node, ctx)
}

function transformElementChildren(children: unknown, ctx: TransformContext, isHead: boolean): unknown {
  if (typeof children === 'string') {
    return isHead ? injectHeadStyle([children], ctx.injectedStyle) : children
  }
  if (Array.isArray(children)) {
    const transformed = children.map(child => transformChild(child, ctx))
    return isHead ? injectHeadStyle(transformed, ctx.injectedStyle) : transformed
  }
  if (children == null) {
    return isHead ? [ctx.injectedStyle] : children
  }
  return children
}

function transformSlots(children: unknown, ctx: TransformContext, isHead: boolean): Slots {
  const slots: Slots = {}

  if (children && typeof children === 'object' && !Array.isArray(children)) {
    for (const [key, slot] of Object.entries(children as Record<string, unknown>)) {
      if (key.startsWith('_') || key === '$stable') continue
      if (typeof slot !== 'function') continue
      const slotFn = slot as SlotFn
      slots[key] = (...args: unknown[]) => {
        const transformed = toArray(slotFn(...args)).map(child => transformChild(child, ctx))
        return isHead && key === 'default'
          ? injectHeadStyle(transformed, ctx.injectedStyle)
          : transformed
      }
    }
    if (isHead && !('default' in slots)) {
      slots.default = () => [ctx.injectedStyle]
    }
    return slots
  }

  // Component authored with array/string/no children: everything is the default slot.
  slots.default = () => {
    const transformed = toArray(children).map(child => transformChild(child, ctx))
    return isHead ? injectHeadStyle(transformed, ctx.injectedStyle) : transformed
  }
  return slots
}

function transformVNode(node: VNode, ctx: TransformContext): VNode {
  const type = node.type
  if (type === Text || type === Comment || type === Static) return node

  const props = (node.props ?? {}) as Props
  const nextProps = props.class != null ? inlineProps(props, ctx.computed) : { ...props }
  const isHead = isHeadVNode(node)

  if (typeof type === 'string') {
    const children = transformElementChildren(node.children, ctx, isHead)
    return h(type, nextProps, children as VNodeArrayChildren)
  }

  if (type === Fragment) {
    const children = transformElementChildren(node.children, ctx, isHead)
    return h(Fragment, nextProps, children as VNodeArrayChildren)
  }

  const slots = transformSlots(node.children, ctx, isHead)
  return h(type as Component, nextProps, slots)
}

/**
 * Apply the computed Tailwind styles to the ETailwind slot VNodes: inline styles,
 * rewrite residual classes, and inject the non-inlinable `<style>` into the head.
 * A `<style>` is injected whenever a `<head>` exists (empty when there are no
 * non-inlinable rules), exactly as React Email always injects one.
 *
 * Throws {@link TailwindMissingHeadError} when there are non-inlinable rules and no
 * `<head>` exists inside the region.
 */
export function applyTailwind(children: unknown, computed: ComputedStyles, hasHead: boolean): VNodeChild[] {
  if (computed.nonInlinableCss !== '' && !hasHead) {
    throw new TailwindMissingHeadError(nonInlinableClassNames(computed))
  }

  const ctx: TransformContext = {
    computed,
    injectedStyle: h('style', { innerHTML: computed.nonInlinableCss }),
  }

  return toArray(children).map(child => transformChild(child, ctx))
}
