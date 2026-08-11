/**
 * Thrown when a Tailwind region produces rules that must live in a `<head>`
 * (media queries / pseudo-classes) but no `<head>` exists inside it.
 */
export class TailwindMissingHeadError extends Error {
  constructor(nonInlinableClassNames: string[]) {
    super(
      `Tailwind: <head> not found inside <ETailwind>.\n`
      + `Move <EHead /> inside <ETailwind>, or remove these classes that require a <head>: `
      + `${nonInlinableClassNames.join(' ')}.`,
    )
    this.name = 'TailwindMissingHeadError'
  }
}
