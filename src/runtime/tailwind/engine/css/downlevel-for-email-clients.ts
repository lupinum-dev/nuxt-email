/**
 * Downlevel the modern CSS emitted by Tailwind to shapes that email clients
 * can parse. The transform is deliberately strict: leaving one nested rule in
 * the output is worse than failing the render with an actionable error.
 */

import {
  type Atrule,
  type CssNode,
  clone,
  type Feature,
  type FeatureRange,
  generate,
  List,
  type ListItem,
  parse,
  type Rule,
  type Selector,
  type SelectorList,
  type StyleSheet,
  walk,
} from 'css-tree'

/**
 * css-tree 3.x parses media range syntax, but the currently published type
 * package does not expose the corresponding nodes yet.
 */
declare module 'css-tree' {
  interface FeatureRange extends CssNodeCommon {
    type: 'FeatureRange'
    kind: string
    left: CssNode
    leftComparison: string
    middle: CssNode
    rightComparison: string | null
    right: CssNode | null
  }

  interface Feature extends CssNodeCommon {
    type: 'Feature'
    kind: string
    name: string
    value: CssNode | null
  }
}

interface Wrapper {
  name: string
  prelude: Atrule['prelude']
}

/**
 * Recursively flatten selector nesting and nested @media/@supports rules,
 * then convert media range syntax such as `(width >= 40rem)` to `min-width`.
 * Mutates the stylesheet in place.
 */
export function downlevelForEmailClients(styleSheet: StyleSheet): void {
  styleSheet.children = flattenStyleSheet(styleSheet)
  downlevelRangeMediaQueries(styleSheet)

  walk(styleSheet, (node) => {
    if (node.type === 'NestingSelector') {
      throw new TypeError(
        'Unable to render Tailwind CSS: an unsupported nesting selector remained after downleveling.',
      )
    }
  })
}

function flattenStyleSheet(styleSheet: StyleSheet): List<CssNode> {
  const output = new List<CssNode>()

  styleSheet.children.forEach((node) => {
    if (node.type === 'Rule') {
      flattenRule(node, null, [], output)
      return
    }

    if (node.type === 'Atrule' && isConditionalAtrule(node)) {
      flattenConditionalAtrule(node, null, [], output)
      return
    }

    // Top-level rules such as @keyframes are already valid unnested CSS.
    output.appendData(clone(node))
  })

  return output
}

function flattenRule(
  rule: Rule,
  parentSelectors: SelectorList | null,
  wrappers: Wrapper[],
  output: List<CssNode>,
): void {
  const selectors = resolveSelectors(rule, parentSelectors)
  flattenBlock(rule.block.children, selectors, wrappers, output)
}

function flattenBlock(
  children: List<CssNode>,
  selectors: SelectorList | null,
  wrappers: Wrapper[],
  output: List<CssNode>,
): void {
  let declarations = new List<CssNode>()

  const flushDeclarations = () => {
    if (declarations.isEmpty) return
    if (!selectors) {
      throw new TypeError(
        'Unable to render Tailwind CSS: declarations were found outside a selector.',
      )
    }

    appendWrappedRule(selectors, declarations, wrappers, output)
    declarations = new List<CssNode>()
  }

  children.forEach((node) => {
    if (node.type === 'Raw') {
      throw new TypeError(
        `Unable to render Tailwind CSS: an unparsed nested CSS shape was encountered (${node.value}).`,
      )
    }

    if (node.type === 'Rule') {
      flushDeclarations()
      flattenRule(node, selectors, wrappers, output)
      return
    }

    if (node.type === 'Atrule') {
      flushDeclarations()
      if (!isConditionalAtrule(node)) {
        throw new TypeError(
          `Unable to render Tailwind CSS: nested @${node.name} rules are not supported.`,
        )
      }
      flattenConditionalAtrule(node, selectors, wrappers, output)
      return
    }

    declarations.appendData(clone(node))
  })

  flushDeclarations()
}

function flattenConditionalAtrule(
  atrule: Atrule,
  selectors: SelectorList | null,
  wrappers: Wrapper[],
  output: List<CssNode>,
): void {
  if (!atrule.block) {
    throw new TypeError(
      `Unable to render Tailwind CSS: @${atrule.name} has no rule block.`,
    )
  }

  flattenBlock(
    atrule.block.children,
    selectors,
    [
      ...wrappers,
      { name: atrule.name, prelude: clonePrelude(atrule.prelude) },
    ],
    output,
  )
}

function appendWrappedRule(
  selectors: SelectorList,
  declarations: List<CssNode>,
  wrappers: Wrapper[],
  output: List<CssNode>,
): void {
  let node: CssNode = {
    type: 'Rule',
    prelude: clone(selectors) as SelectorList,
    block: { type: 'Block', children: declarations },
  }

  for (let index = wrappers.length - 1; index >= 0; index--) {
    const wrapper = wrappers[index]!
    node = {
      type: 'Atrule',
      name: wrapper.name,
      prelude: clonePrelude(wrapper.prelude),
      block: {
        type: 'Block',
        children: new List<CssNode>().fromArray([node]),
      },
    }
  }

  output.appendData(node)
}

function resolveSelectors(
  rule: Rule,
  parentSelectors: SelectorList | null,
): SelectorList {
  if (rule.prelude.type !== 'SelectorList') {
    throw new TypeError(
      'Unable to render Tailwind CSS: raw selectors cannot be downleveled safely.',
    )
  }

  if (!parentSelectors) {
    assertNoNestingSelector(rule.prelude)
    return clone(rule.prelude) as SelectorList
  }

  const resolved = new List<CssNode>()
  const nestedSelectors = rule.prelude
  parentSelectors.children.forEach((parentNode) => {
    const parent = parentNode as Selector

    nestedSelectors.children.forEach((nestedNode) => {
      const nested = nestedNode as Selector
      if (containsNestingSelector(nested)) {
        const selector = clone(nested) as Selector
        walk(selector, {
          enter(node: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
            if (node.type === 'NestingSelector') {
              list.replace(item, (clone(parent) as Selector).children)
            }
          },
        })
        resolved.appendData(selector)
      }
      else {
        const selector = parse(
          `${generate(parent)} ${generate(nested)}`,
          { context: 'selector' },
        ) as Selector
        resolved.appendData(selector)
      }
    })
  })

  return { type: 'SelectorList', children: resolved }
}

function containsNestingSelector(selector: Selector): boolean {
  let found = false
  walk(selector, (node) => {
    if (node.type === 'NestingSelector') found = true
  })
  return found
}

function assertNoNestingSelector(selectors: SelectorList): void {
  walk(selectors, (node) => {
    if (node.type === 'NestingSelector') {
      throw new TypeError(
        'Unable to render Tailwind CSS: a top-level nesting selector has no parent selector.',
      )
    }
  })
}

function isConditionalAtrule(atrule: Atrule): boolean {
  return atrule.name === 'media' || atrule.name === 'supports'
}

function clonePrelude(prelude: Atrule['prelude']): Atrule['prelude'] {
  return prelude ? clone(prelude) as Atrule['prelude'] : null
}

function downlevelRangeMediaQueries(styleSheet: StyleSheet): void {
  const replacements: Array<{
    item: ListItem<CssNode>
    replacement: Feature
  }> = []

  walk(styleSheet, {
    enter(originalNode: CssNode, item: ListItem<CssNode>) {
      const node = originalNode as CssNode | FeatureRange
      if (item && node.type === 'FeatureRange') {
        const replacement = downlevelFeatureRange(node)
        if (replacement) replacements.push({ item, replacement })
      }
    },
  })

  for (const { item, replacement } of replacements) {
    item.data = replacement as unknown as CssNode
  }
}

function downlevelFeatureRange(range: FeatureRange): Feature | null {
  if (range.left.type !== 'Identifier') return null

  let prefix: string
  if (range.leftComparison === '>=' || range.leftComparison === '>') {
    prefix = 'min-'
  }
  else if (range.leftComparison === '<=' || range.leftComparison === '<') {
    prefix = 'max-'
  }
  else {
    return null
  }

  return {
    type: 'Feature',
    kind: 'media',
    name: `${prefix}${range.left.name}`,
    value: range.middle,
  }
}
