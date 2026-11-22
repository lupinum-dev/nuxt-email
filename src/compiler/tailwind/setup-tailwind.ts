import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { compile } from 'tailwindcss'

// Resolved from this package, so the CSS always matches the `tailwindcss` compiler it uses.
const require = createRequire(import.meta.url)
const TAILWIND_STYLESHEETS: Record<string, string> = {
  'tailwindcss': 'tailwindcss/index.css',
  'tailwindcss/preflight.css': 'tailwindcss/preflight.css',
  'tailwindcss/theme.css': 'tailwindcss/theme.css',
  'tailwindcss/utilities.css': 'tailwindcss/utilities.css',
}

/**
 * Faithful port of React Email's `setup-tailwind.ts`.
 *
 * Drives the Tailwind v4 `compile()` API with the same layered base CSS and
 * `loadStylesheet` / `loadModule` callbacks, reading Tailwind's own stylesheets
 * from the installed `tailwindcss` package. No PostCSS is involved.
 *
 * @param css Unlayered CSS for every email (`@theme`, `@utility`, ...): the
 * content of `app/emails/tailwind.css`.
 */
export async function setupTailwind(css = '') {
  const baseCss = `
@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme) theme(inline);
@import "tailwindcss/utilities.css" layer(utilities);
${css ? '@import "custom.css";' : ''}
`

  const compiler = await compile(baseCss, {
    async loadModule(_id, _base, resourceHint) {
      throw new Error(
        `Tailwind ${resourceHint} module imports are not supported in email Tailwind CSS; use @theme and @utility in app/emails/tailwind.css instead`,
      )
    },
    polyfills: 0, // Polyfills.None — matches React Email; @property blocks stay raw
    async loadStylesheet(id, base) {
      const packaged = TAILWIND_STYLESHEETS[id]
      if (packaged !== undefined) {
        return { base, path: packaged, content: await readFile(require.resolve(packaged), 'utf8') }
      }

      if (id === 'custom.css') {
        return { base, path: id, content: css }
      }

      throw new Error(
        `Tailwind stylesheet import "${id}" is not supported in email Tailwind CSS`,
      )
    },
  })

  /** The CSS for these candidates; the compiler keeps every candidate it was given before. */
  return (candidates: string[]): string => compiler.build(candidates)
}
