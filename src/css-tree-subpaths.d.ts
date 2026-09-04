// css-tree exposes these entries, but @types/css-tree only declares the root.
// Reuse its signatures rather than maintaining a second AST type model.
declare module 'css-tree/parser' {
  export { parse as default } from 'css-tree'
}

declare module 'css-tree/generator' {
  export { generate as default } from 'css-tree'
}

declare module 'css-tree/walker' {
  import type { find, walk } from 'css-tree'

  const walker: typeof walk & { find: typeof find }
  export default walker
}

declare module 'css-tree/utils' {
  export { clone, List, string } from 'css-tree'
}
