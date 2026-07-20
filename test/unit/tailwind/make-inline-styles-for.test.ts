import { parse, type StyleSheet } from 'css-tree'
import { describe, expect, it } from 'vitest'
import { getCustomProperties } from '../../../src/runtime/tailwind/engine/css/get-custom-properties'
import { makeInlineStylesFor } from '../../../src/runtime/tailwind/engine/css/make-inline-styles-for'

/**
 * Ported from React Email's make-inline-styles-for.spec.ts. The only behavioral
 * difference from the original is the return shape: this engine emits real
 * kebab-case CSS property names in an ordered `Map` (serialized here via
 * `Object.fromEntries`) instead of React DOM camelCase style keys.
 */
describe('makeInlineStylesFor()', () => {
  it('works in simple use case', () => {
    const tailwindStyles = parse(`
      .bg-red-500 { background-color: #f56565; }
      .w-full { width: 100%; }
    `) as StyleSheet

    expect(
      Object.fromEntries(
        makeInlineStylesFor(
          tailwindStyles.children.toArray(),
          getCustomProperties(tailwindStyles),
        ),
      ),
    ).toMatchInlineSnapshot(`
      {
        "background-color": "#f56565",
        "width": "100%",
      }
    `)
  })

  it('does basic local variable resolution', () => {
    const tailwindStyles = parse(`
      .btn {
        --btn-bg: #3490dc;
        --btn-text: #fff;
        background-color: var(--btn-bg);
        color: var(--btn-text);
        padding: 0.5rem 1rem;
        border-radius: 0.25rem;
      }
    `) as StyleSheet

    expect(
      Object.fromEntries(
        makeInlineStylesFor(
          tailwindStyles.children.toArray(),
          getCustomProperties(tailwindStyles),
        ),
      ),
    ).toMatchInlineSnapshot(`
      {
        "background-color": "#3490dc",
        "border-radius": "0.25rem",
        "color": "#fff",
        "padding": "0.5rem 1rem",
      }
    `)
  })

  it('strips Tailwind v4 variant-stacking var() refs with empty fallbacks', () => {
    const tailwindStyles = parse(`
      .tabular-nums {
        font-variant-numeric: var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) tabular-nums var(--tw-numeric-fraction,);
      }
    `) as StyleSheet

    expect(
      Object.fromEntries(
        makeInlineStylesFor(
          tailwindStyles.children.toArray(),
          getCustomProperties(tailwindStyles),
        ),
      ),
    ).toMatchInlineSnapshot(`
      {
        "font-variant-numeric": "tabular-nums",
      }
    `)
  })

  it('preserves user-authored empty-fallback var() refs (non --tw- prefix)', () => {
    const userStyles = parse(`
      .thing {
        color: var(--my-color,);
        background: var(--brand,) var(--tw-custom,);
      }
    `) as StyleSheet

    expect(
      Object.fromEntries(
        makeInlineStylesFor(
          userStyles.children.toArray(),
          getCustomProperties(userStyles),
        ),
      ),
    ).toMatchInlineSnapshot(`
      {
        "background": "var(--brand,)",
        "color": "var(--my-color,)",
      }
    `)
  })

  it('collapses outer --tw-* var() that becomes empty after inner --tw-* var() collapses', () => {
    const tailwindStyles = parse(`
      .nested {
        font-variant-numeric: var(--tw-outer, var(--tw-inner,)) tabular-nums;
      }
    `) as StyleSheet

    expect(
      Object.fromEntries(
        makeInlineStylesFor(
          tailwindStyles.children.toArray(),
          getCustomProperties(tailwindStyles),
        ),
      ),
    ).toMatchInlineSnapshot(`
      {
        "font-variant-numeric": "tabular-nums",
      }
    `)
  })
})
