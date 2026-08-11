import type { TailwindConfig } from '../tailwind/engine/index'
import type { NestedTailwindHolder } from '../tailwind/nested'
import type { DefineComponent, PropType } from 'vue'
import { createCommentVNode, defineComponent, inject, provide } from 'vue'
import { getEmailRenderContext } from '../render/define-email'
import { createTailwindEngine } from '../tailwind/engine/index'
import { createTailwindRegion, TAILWIND_NESTED_KEY } from '../tailwind/nested'

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
 * E* primitives self-inline through the context provided here
 * ({@link TAILWIND_NESTED_KEY}). Once Vue has rendered the subtree exactly once,
 * the marker-scoped post-render pass ({@link ../tailwind/post-render}) handles
 * structural and native elements and inserts non-inlinable CSS into `<head>`.
 * Nothing outside an `<ETailwind>` boundary is affected.
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
    if (inject(TAILWIND_NESTED_KEY, null)) {
      throw new TypeError('ETailwind boundaries cannot be nested; wrap the email document in one ETailwind boundary.')
    }

    // Provide the holder synchronously, before the first await: after an await the
    // active component instance is lost and provide() would no-op. The engine and
    // region are filled in below, before any child injects the holder (children
    // render only after this component's render function has run).
    const holder: NestedTailwindHolder = { engine: null, region: null }
    provide(TAILWIND_NESTED_KEY, holder)

    const engine = await createTailwindEngine({
      config: props.config,
      theme: props.theme,
      utility: props.utility,
    })
    holder.engine = engine

    return () => {
      const children = slots.default?.() ?? []
      const region = createTailwindRegion(engine, [])
      holder.region = region
      const context = getEmailRenderContext()
      if (context) {
        (context.tailwindRegions ??= []).push(region)
      }

      return [
        createCommentVNode(region.startMarker),
        ...children,
        createCommentVNode(region.endMarker),
      ]
    }
  },
}) as DefineComponent<ETailwindProps>
