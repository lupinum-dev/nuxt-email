// Splits markup and string literals: `class="p-4 sm:p-6"`, `['italic', tone]`.
const SEPARATORS = /[\s"'`<>{}]+/
// Also splits JavaScript expressions, so object keys and ternary branches are bare
// names: `{ underline: active }`, `{underline:active}`, `a ? 'x' : 'y'`.
const EXPRESSION_SEPARATORS = /[\s"'`<>{}:,;()=?&|!]+/
// Classes with `[...]` groups, matched on the raw source so quotes and `>` inside
// the brackets survive: `content-['hi']`, `bg-[url('/x.png')]`, `before:content-['*']`,
// `[&>p]:m-0`, `bg-[#fff]/50`, `[&_p]:content-['x']`.
const BRACKET_CLASS = /[\w:@.\-!/]*\[[^\]\n]+\](?:[\w:\-/.]*\[[^\]\n]+\])*[\w:\-/.]*/g

/**
 * Every token in the given source texts that could be a Tailwind class. Over-collecting
 * is safe: Tailwind ignores tokens that are not utilities, and the style table
 * only keeps classes Tailwind produced CSS for.
 */
export function classCandidates(sources: Iterable<string>): string[] {
  const candidates = new Set<string>()
  for (const source of sources) {
    for (const token of [...source.split(SEPARATORS), ...source.split(EXPRESSION_SEPARATORS), ...(source.match(BRACKET_CLASS) ?? [])]) {
      if (token !== '') candidates.add(token)
    }
  }
  return [...candidates]
}
