/**
 * Adapted from React Email's `get-react-property.ts`.
 *
 * React Email converts a css-tree declaration property (already kebab-case CSS,
 * e.g. `background-color`) into a React DOM style key (`backgroundColor`) so it
 * can spread it onto a React element's `style` object. Its `-ms-` special case
 * exists purely because React's camelCase convention is `msTransform` (lowercase
 * `m`) unlike every other vendor prefix (`WebkitTransform`).
 *
 * This engine emits inline styles as real CSS `property: value` pairs, not React
 * DOM keys, so no camelCase conversion is wanted. css-tree already yields the
 * canonical kebab-case property name; we only lowercase it to match React Email's
 * behavior (it lowercases before converting). Custom properties (`--tw-*`) never
 * reach this function — `makeInlineStylesFor` skips `--` declarations — so the
 * historical lowercasing of custom-property names is a non-issue here.
 */
export function getCssProperty(prop: string): string {
  return prop.toLowerCase()
}
