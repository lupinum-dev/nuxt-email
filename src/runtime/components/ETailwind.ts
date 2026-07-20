import type { TailwindConfig } from '../tailwind/engine/index'
import type { DefineComponent, PropType } from 'vue'
import { defineComponent } from 'vue'
import { createTailwindEngine } from '../tailwind/engine/index'
import { applyTailwind, scanTailwindTree } from '../tailwind/transform'

export interface ETailwindProps {
  /** Tailwind config (everything except `content`), same shape as React Email. */
  config?: TailwindConfig
  /** Raw CSS appended to the theme layer (`@theme`), same as React Email's `theme`. */
  theme?: string
  /** Raw CSS appended to the utilities layer, same as React Email's `utility`. */
  utility?: string
}

/**
 * Server-only Tailwind boundary. Faithful behavioural port of React Email's
 * `<Tailwind>`: it compiles the Tailwind stylesheet for its config, then inlines
 * the utilities used by its subtree into each element's style, moves media-query
 * and pseudo-class rules into a `<style>` in the `<head>`, and rewrites residual
 * class names.
 *
 * The compile step is async (Tailwind's `compile()` is async), so `setup` awaits
 * the engine; the actual inlining is synchronous and happens in the render
 * function, which walks the slot VNodes. Nothing outside a `<Tailwind>` boundary
 * is affected, so emails that do not use it render exactly as before.
 */
export const ETailwind = defineComponent({
  name: 'ETailwind',
  inheritAttrs: false,
  props: {
    config: {
      type: Object as PropType<TailwindConfig>,
      default: undefined,
    },
    theme: {
      type: String,
      default: undefined,
    },
    utility: {
      type: String,
      default: undefined,
    },
  },
  async setup(props, { slots }) {
    const engine = await createTailwindEngine({
      config: props.config,
      theme: props.theme,
      utility: props.utility,
    })

    return () => {
      const children = slots.default?.() ?? []
      const { classNames, hasHead } = scanTailwindTree(children)
      const computed = engine.computeStyles(classNames)
      return applyTailwind(children, computed, hasHead)
    }
  },
}) as DefineComponent<ETailwindProps>
