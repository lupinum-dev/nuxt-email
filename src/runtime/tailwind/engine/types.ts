import type { Config } from 'tailwindcss'

/**
 * A Tailwind v4 JS config, minus `content` (email rendering derives its
 * candidate set from the rendered tree, not from filesystem globs).
 *
 * Mirrors React Email's `TailwindConfig`.
 */
export type TailwindConfig = Omit<Config, 'content'>

/**
 * Options for {@link createTailwindEngine}.
 *
 * - `config`   — a Tailwind JS config object (theme, plugins, …).
 * - `theme`    — raw CSS injected as an extra `layer(theme)` import
 *   (`@theme { … }` / custom properties).
 * - `utility`  — raw CSS injected as an extra `layer(utilities)` import
 *   (`@utility …`).
 *
 * Matches the public `<Tailwind config theme utility>` prop surface in React
 * Email; the two CSS strings map to setup-tailwind's `cssConfigs`.
 */
export interface TailwindEngineOptions {
  config?: TailwindConfig
  theme?: string
  utility?: string
}
