import type { TailwindConfig } from '../tailwind/engine/index'
import type { NestedTailwindHolder } from '../tailwind/nested'
import type { DefineComponent, PropType } from 'vue'
import { createCommentVNode, defineComponent, inject, provide } from 'vue'
import { getEmailRenderContext } from '../render/define-email'
import { createTailwindEngine } from '../tailwind/engine/index'
import { createTailwindRegion, TAILWIND_NESTED_KEY } from '../tailwind/nested'
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
 * The slot-visible subtree is inlined synchronously by the VNode transform. Classes
 * emitted inside NESTED user components (which only exist once Vue renders them
 * during SSR) are reached two other ways: E* primitives self-inline via the context
 * provided here ({@link TAILWIND_NESTED_KEY}), and plain elements are inlined
 * post-render. The region is registered on the per-render context so the post-render
 * pass ({@link ../tailwind/post-render}) can complete the head `<style>` and splice
 * nested plain elements. Nothing outside a `<Tailwind>` boundary is affected, so
 * emails that do not use it render exactly as before.
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
      const { classNames } = scanTailwindTree(children)
      const computed = engine.computeStyles(classNames)

      const region = createTailwindRegion(engine, [...classNames])
      holder.region = region
      const context = getEmailRenderContext()
      if (context) {
        (context.tailwindRegions ??= []).push(region)
      }

      const applied = applyTailwind(children, computed, region.placeholder)
      return [
        createCommentVNode(region.startMarker),
        ...applied,
        createCommentVNode(region.endMarker),
      ]
    }
  },
}) as DefineComponent<ETailwindProps>
