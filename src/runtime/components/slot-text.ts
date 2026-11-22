import type { VNode } from 'vue'
import { createTextVNode, Text } from 'vue'

const LEADING = /^[ \t\n\r\f]+/
const TRAILING = /[ \t\n\r\f]+$/

function trimText(node: VNode | undefined, pattern: RegExp): VNode | undefined {
  if (node === undefined || node.type !== Text || typeof node.children !== 'string') {
    return node
  }
  const text = node.children.replace(pattern, '')
  return text === node.children ? node : createTextVNode(text)
}

/**
 * Removes the whitespace at the start and the end of the content of an inline component.
 *
 * A formatter puts the content of `<ELink>` on its own lines, and Vue keeps each of those line
 * breaks as one space. In an email that space is inside the link: the underline runs past the
 * last word, and a space comes before the character after the link. A non-breaking space stays.
 */
export function trimSlotEdges(nodes: VNode[] | undefined): VNode[] | undefined {
  if (nodes === undefined || nodes.length === 0) {
    return nodes
  }
  const trimmed = [...nodes]
  trimmed[0] = trimText(trimmed[0], LEADING)!
  trimmed[trimmed.length - 1] = trimText(trimmed[trimmed.length - 1], TRAILING)!
  return trimmed
}
