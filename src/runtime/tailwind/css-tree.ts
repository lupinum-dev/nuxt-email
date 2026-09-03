// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- Load ambient subpath types for source consumers without a runtime import; declaration emit drops this reference.
/// <reference path="../../css-tree-subpaths.d.ts" />

import type * as CssTree from 'css-tree'
import parser from 'css-tree/parser'
import generator from 'css-tree/generator'
import walker from 'css-tree/walker'
import { clone as cloneNode, List as NodeList, string as cssString } from 'css-tree/utils'

// The root entry constructs a lexer and reads package-relative JSON at runtime.
// These public syntax-only entries keep the same AST operations bundle-safe.
export const parse: typeof CssTree.parse = parser
export const generate: typeof CssTree.generate = generator
export const walk: typeof CssTree.walk = walker
export const find: typeof CssTree.find = walker.find
export const clone: typeof CssTree.clone = cloneNode
export const List: typeof CssTree.List = NodeList
export type List<T> = CssTree.List<T>
export const string: typeof CssTree.string = cssString
export type * from 'css-tree'
