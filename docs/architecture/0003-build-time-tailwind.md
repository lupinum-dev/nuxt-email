# ADR 0003: resolve Tailwind classes at build time

## Status

Accepted. Supersedes the Tailwind parts of ADR 0001 and ADR 0002.

## Context

Before this decision, templates wrapped their markup in `ETailwind`. Each render started the Tailwind engine, collected the classes from the rendered HTML, converted the CSS to email-safe declarations and wrote them back into the HTML. Components read nested Tailwind state to merge styles. A render of a 48-row email took about 40 ms. The production server bundle contained `tailwindcss` and `css-tree`.

Templates and their classes are known when the application builds. The Nuxt module, the standalone build and the tests each compiled templates in a different way.

## Decision

Nuxt Email resolves Tailwind classes when it compiles the templates:

1. One function, `compileEmailDirectory()`, bundles the registry and every template with esbuild. Its SFC step compiles each `.vue` file the bundle loads and applies the Tailwind template transform.
2. The compiler reads class candidates from exactly the files the bundle read: the esbuild metafile inputs, without files in `node_modules`, the package's own runtime and virtual modules. A component that a template imports from outside the email directory contributes its classes.
3. It runs Tailwind once, with the optional `app/emails/tailwind.css`, and converts the result to a style table. The table maps each class to inline declarations, a residual class name, head rules, and a `cell` flag for head classes that set only padding.
4. The conversion un-nests the CSS, writes colors as hex or `rgba()` and converts media range syntax with Lightning CSS. Sizes in `rem` become `px` at 16 px per `rem`, because Outlook on Windows does not support `rem`.
5. A Vue template transform rewrites `class` and `style` on every element and component into one call that reads the table at render time.
6. After the render, the renderer writes the head rules of the classes it used into `<head>`.

The Nuxt module, `@lupinum/nuxt-email/build` and `createTestRenderer()` use the same compiler, registry generator and renderer. The module serves the compiled registry as a Nitro virtual module and applies Nitro's server auto-imports to it. `EEmail` is the only document root. Per-render state lives on the Vue app of that render.

Some conversion steps stay owned code, because Lightning CSS does not do them or changes the result:

- `var()` resolution: Lightning CSS does not resolve custom properties.
- `calc()` evaluation: Lightning CSS stores numbers as 32-bit floats and rounds long decimals, which changed line boxes in Chrome.
- `oklch()` to `rgb()` by channel clipping: Lightning CSS gamut mapping changes colors such as `blue-500`.
- Logical properties to left-to-right physical ones, after Lightning CSS: its logical-property feature writes `:dir()` and `:lang()` rules that cannot be inlined, so it stays off, and it merges physical sides back into logical shorthands.
- `text-decoration-line` to `text-decoration` in inline styles: Outlook on Windows reads only the shorthand.
- `calc(infinity*1px)` to `9999px`, and `width < X` to `max-width:X-0.02px`, because the Lightning CSS output for both needs syntax that email clients do not support. The 0.02px keeps the exclusive upper bound of `max-*:` variants from overlapping the next breakpoint.
- Stacked media variants join into one `@media` condition with `and`, and a head selector that is one `:where(X)` or `:is(X)` becomes `X`, because some email clients drop nested at-rules and these selector functions.
- Removal of the `lab()` fallback lines and `@supports (color: lab(...))` blocks that Lightning CSS adds.

## Consequences

- A production render loads Vue and the plain-text converter. It does not load Tailwind or a CSS parser. The 48-row email renders in about 3 ms.
- A class must appear complete in the source. A class built at run time stays in `class` unchanged. The development preview lists those classes.
- Components receive their final `style` and need no Tailwind code.
- Unsupported Tailwind conditions, such as `@container` variants, fail the build instead of the render.
- In development, a change in the email directory or in any file the last build read rebuilds the registry and the style table. Nuxt's watcher reports only files in the project, so a change in `node_modules` does not.
- Every `.vue` file the bundle loads must use the email template subset: no style, custom or `src=` blocks, scripts in JavaScript or TypeScript, HTML templates. This applies in Nuxt too.
- `unplugin-vue` and the Rollup-based Nitro compile path are gone. `lightningcss` is a new build-time dependency.
- Generated sizes are `px` and colors are hex or `rgba()`. A forbidden-syntax test on a fixed utility matrix and the golden files guard this; three known utilities still produce `var()`, `:where()`/`:is()` inside a selector, or `calc()`.
- Inline declarations merge in stylesheet order, with author `style` last, so a class list gives the same result as the browser applies to the head rules.
- A class that only sets custom properties, such as `ring-blue-500`, gets no style-table entry: per-class resolution cannot combine it with the utility that reads it.
- The Tailwind engine is build-time code under `src/compiler/`. Code under `src/runtime/` does not import it.

## Rejected alternative

### Keep the runtime engine

Rejected because every render repeated work that depends only on the source, the production bundle carried the compiler, and components needed shared Tailwind state to merge styles. A cache per class set would have kept the bundle size and the second code path.
