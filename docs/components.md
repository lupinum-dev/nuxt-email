# Component reference

Nuxt Email provides nineteen E-prefixed components. They are auto-registered inside email templates and the isolated server renderer. All composition uses ordinary Vue slots; all attributes use Vue and HTML names rather than React prop aliases.

## Shared rules

- Native attributes and `class` are forwarded unless a component fixes an email-safety invariant.
- `style` accepts the normal Vue object, string, or array forms. Object keys may be camelCase or kebab-case.
- Vue interpolation and attribute serialization escape text by default.
- Every component rejects `innerHTML`, `textContent`, and attribute names beginning with `on`, case-insensitively. There is no raw-HTML primitive.
- Event handlers have no place in rendered email and are not supported.
- Required strings such as `href` and `src` must be non-empty at runtime.
- React Email shorthand props such as `mx` are not supported; use ordinary CSS in `style`.

## Document components

| Component | Output and important props | Defaults and fixed behavior |
| --- | --- | --- |
| `EHtml` | Complete `<html>` root; accepts safe HTML attributes. | `lang="en"`, `dir="ltr"`. Every render must contain exactly one `<html>` root and one `<body>`; `EHtml` and `EBody` are the supported wrappers. |
| `EHead` | `<head>` with an optional default slot for `<title>`, `<meta>`, and email head content. | Always inserts UTF-8 content-type and Apple message-reformatting meta tags before slot content. |
| `EBody` | `<body>` containing the full-width presentation table used for reliable email layout. | `lang="en"`, `dir="ltr"`. User style is applied to the inner cell; background values are mirrored to `<body>`, while specified body margin/padding reset properties are zeroed there. |
| `EPreview` | Hidden inbox-preview text from a text-only default slot. | Truncates safely at 200 UTF-16 code units, adds the compatibility filler when shorter, cannot be made visible through a style override, and is excluded from plain text. |

Use an explicit `<title>` inside `EHead`; `EPreview` does not generate or hoist a title.

```vue
<EHtml lang="de" dir="ltr">
  <EHead>
    <title>Bestellung bestätigt</title>
  </EHead>
  <EBody :style="{ backgroundColor: '#f5f5f5', margin: 0 }">
    <EPreview>Deine Bestellung ist bestätigt.</EPreview>
    <EText>Sichtbarer Inhalt</EText>
  </EBody>
</EHtml>
```

## Text and content components

| Component | Important props | Defaults and fixed behavior |
| --- | --- | --- |
| `EHeading` | `as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'`; safe heading attributes. | `as="h1"`. Invalid tags fail rendering. |
| `EText` | Safe paragraph attributes and the default slot. | Renders `<p>` with `font-size: 14px`, `line-height: 24px`, and `16px` top/bottom margins unless overridden. CSS margin shorthand is expanded deterministically. |
| `ELink` | Required non-empty `href`; safe anchor attributes. | `target="_blank"`, `color: #067df7`, and no text-decoration line. Override `target`, `rel`, and styles explicitly when needed. URL schemes are not validated. |
| `EImg` | Required non-empty `src` and required string `alt`; safe image attributes such as `width` and `height`. | Block display with no border/outline/text decoration. Use `alt=""` for a decorative image. Rendering serializes the URL but never fetches it. |
| `EHr` | Safe horizontal-rule attributes. | Full width, transparent border, and `1px solid #eaeaea` top border. User styles override individual defaults. |

```vue
<EHeading as="h2" :style="{ margin: '0 0 12px' }">
  Account ready
</EHeading>
<EText :style="{ color: '#334155' }">
  Your workspace is ready.
</EText>
<ELink href="https://example.com/account" rel="noreferrer">
  Open account
</ELink>
<EImg
  src="https://example.com/logo.png"
  alt="Example"
  width="120"
  height="32"
/>
<EHr :style="{ borderTopColor: '#cbd5e1' }" />
```

## Table-layout components

| Component | Output and important props | Defaults and fixed behavior |
| --- | --- | --- |
| `EContainer` | Centered presentation table for bounded content; accepts safe table attributes except the fixed semantics. | `width="100%"`, `max-width: 37.5em`; physical padding moves to the inner cell. `border`, `cellpadding`, `cellspacing`, and `role` are fixed and cannot be overridden. |
| `ESection` | Full-width presentation table with one inner cell. | Physical padding moves to the inner cell. Presentation-table attributes are fixed and cannot be overridden. |
| `ERow` | Full-width presentation table whose row receives slot content. | Place `EColumn` components directly in the slot. Physical padding is carried by an outer presentation-table cell so clients that force `border-collapse: collapse` still honor it. Presentation-table attributes are fixed and cannot be overridden. |
| `EColumn` | A `<td>` cell; accepts safe cell attributes such as `width`, `colspan`, alignment, and style. | No synthetic React marker and no default width. |

For `EContainer`, `ESection`, and `ERow`, physical `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, and `paddingLeft` are placed on a `<td>` for compatibility. `ERow` adds the wrapper only when physical padding is present, so an unpadded row keeps its compact markup. Logical padding properties remain on the table.

This relocation applies to padding known at render time: author `style` and non-variant Tailwind utilities such as `p-4`. Responsive or pseudo-class utilities such as `md:p-4` remain CSS rules on the presentation table because they have no single inline value to move. Clients that force `table { border-collapse: collapse }` may ignore that table padding. When responsive padding is required, put the utility on an inner `EColumn` (a real `<td>`) and verify the target clients.

`EContainer`, `ESection`, and `ERow` fix `border`, `cellpadding`, `cellspacing`, and `role` to preserve the email-client-safe table layout. Unlike React Email, which silently discards overrides for these attributes, Nuxt Email throws a `TypeError` when any of them is supplied (case-insensitive, so `cellPadding` and `cellSpacing` are caught too). Set these presentation properties through `style` if you need to adjust them.

```vue
<EContainer :style="{ maxWidth: '600px', padding: '24px' }">
  <ESection :style="{ padding: '16px 20px' }">
    <ERow>
      <EColumn width="50%">
        Left
      </EColumn>
      <EColumn width="50%">
        Right
      </EColumn>
    </ERow>
  </ESection>
</EContainer>
```

## Outlook-safe button

`EButton` renders an anchor with conditional MSO spacer fragments so its padding remains usable in Outlook for Windows.

| Prop | Contract |
| --- | --- |
| `href` | Required non-empty string. The destination is escaped but its scheme is not validated. |
| `target` | Defaults to `_blank`; override with a native anchor target when required. |
| `style` | Normal Vue style. Padding is also converted into deterministic Outlook spacer markup. |
| Other attributes | Safe anchor attributes such as `class`, `id`, `rel`, and `aria-*` are forwarded. |

Button padding accepts finite non-negative numbers or `px`, `em`, `rem`, and `%` values. Shorthand may contain one to four values, and later physical declarations override earlier shorthand exactly as CSS source order does. Other units, negative values, non-finite numbers, and output large enough to inflate the email are rejected instead of emitting corrupted MSO markup.

```vue
<EButton
  href="https://example.com/activate"
  rel="noreferrer"
  :style="{
    backgroundColor: '#0f5132',
    borderRadius: '6px',
    color: '#ffffff',
    padding: '12px 20px',
  }"
>
  Activate account
</EButton>
```

## Fonts

`EFont` declares an `@font-face` and a document-wide default font. It must be placed inside `EHead`.

| Prop | Contract |
| --- | --- |
| `fontFamily` | Required string. The primary font; use `fallbackFontFamily` for alternatives rather than a comma list. |
| `fallbackFontFamily` | Required. One `FontFallback` or an ordered array (`'Arial'`, `'Helvetica'`, `'Verdana'`, `'Georgia'`, `'Times New Roman'`, `'serif'`, `'sans-serif'`, `'monospace'`, `'cursive'`, `'fantasy'`). |
| `webFont` | Optional `{ url, format }`, where `format` is `woff`, `woff2`, `truetype`, `opentype`, `embedded-opentype`, or `svg`. Emits the `src` descriptor; not every client honors web fonts. |
| `fontStyle` | Defaults to `normal`. |
| `fontWeight` | Defaults to `400`. |

`EFont` emits one `<style>` containing the `@font-face` rule and a global `* { font-family }` rule that lists the primary font followed by every fallback. The Outlook `mso-font-alt` descriptor uses the first fallback.

```vue
<EHead>
  <EFont
    font-family="Roboto"
    :fallback-font-family="['Verdana', 'sans-serif']"
    :web-font="{ url: 'https://fonts.example.com/roboto.woff2', format: 'woff2' }"
    :font-weight="700"
  />
</EHead>
```

## Inline code

`ECodeInline` renders inline code inside a text flow. Place it inside `EText` (or another text element). It accepts safe HTML attributes and forwards them, plus `style`, to both emitted elements.

It renders three siblings: a `<style>` with the Orange.fr webmail compatibility rule, a visible `<code>` element, and a hidden copy `<span>` (`display:none`). Because the content is emitted twice, plain-text conversion contains it twice; this matches React Email exactly.

```vue
<EText>
  Run <ECodeInline class="inline-code">pnpm install</ECodeInline> to begin.
</EText>
```

## Syntax-highlighted code blocks

`ECodeBlock` renders a syntax-highlighted `<pre>` using PrismJS grammars and a theme object. It is server-only.

| Prop | Contract |
| --- | --- |
| `code` | Required source string. |
| `language` | Required `CodeBlockLanguage` (a PrismJS language id such as `javascript` or `css`). An unknown language throws. |
| `theme` | Required `CodeBlockTheme`. Themes are named exports of the package (`dracula`, `oneDark`, `nord`, and the rest of the PrismJS theme set). |
| `lineNumbers` | Optional. Prepends a line-number column. |
| `fontFamily` | Optional. Applies a font family to every rendered element, mainly to override a global `EFont`. |

Source spaces are encoded as no-break space plus zero-width joiner plus zero-width space, and each line ends with `<br/>`, matching React Email byte-for-byte.

```vue
<script setup lang="ts">
import { dracula } from '@lupinum/nuxt-email/themes'
</script>

<template>
  <ECodeBlock
    language="javascript"
    :theme="dracula"
    :line-numbers="true"
    :code="`const x = 1;\nconsole.log(x);`"
  />
</template>
```

## Markdown

`EMarkdown` renders Markdown to email-safe HTML with inline styles.

Raw HTML is rejected, including HTML comments. Links and images accept relative URLs plus `http`, `https`, `mailto`, `tel`, and `cid`; other schemes are rejected after HTML-entity and control-character normalization. HTML-looking text inside code spans and fences is escaped. This keeps Markdown from becoming the raw-HTML escape hatch that the component API otherwise excludes.

| Prop | Contract |
| --- | --- |
| `source` | Optional Markdown string. When it is a string it wins; otherwise the text-only default slot is used. |
| `markdownCustomStyles` | Optional per-element style overrides merged over the defaults (for example `{ h1: { color: 'red' } }`). |
| `markdownContainerStyles` | Optional style for the container `<div>`. |

The default slot must contain text only; an element child throws a `TypeError` rather than being silently stringified. Links render with `target="_blank"`, tables with `role="presentation"`. Unlike React Email, the container omits the `data-id="react-email-markdown"` marker (the same no-data-id divergence as `EColumn`); see the [conformance report](./conformance/report.md).

```vue
<EMarkdown source="# Title\n\nA paragraph with a [link](https://example.com)." />
```

## Tailwind

`ETailwind` is the server-only Tailwind v4 boundary. It compiles the utilities used by its subtree into email-safe output at render time. Wrap the whole document so a `<head>` is available inside the boundary.

| Prop | Contract |
| --- | --- |
| `config` | Optional Tailwind config (everything except `content`), matching React Email's `TailwindConfig`. |
| `theme` | Optional raw CSS appended to the `@theme` layer. |
| `utility` | Optional raw CSS appended to the utilities layer. |

Utility classes on descendant elements are inlined into each element's `style`, with precedence `component defaults < Tailwind utilities < author style`. Rules that cannot be inlined (media queries, pseudo-classes) are collected into a `<style>` in the `<head>`, residual class names are sanitized, and `mso-*` properties survive inlining. If a class needs a `<head>` and none is present inside the boundary, rendering throws with a message naming the offending classes.

`ETailwind` does **not** load your Nuxt application's stylesheet or inherit browser CSS variables. Email utilities must compile to concrete values. Pass a Tailwind v4 `theme` string (or `config`) to the boundary, ideally generated from the same application-owned design-token module used by your web stylesheet:

```vue
<script setup lang="ts">
const emailTheme = '@theme { --color-primary: #2563eb; }'
</script>

<template>
  <ETailwind :theme="emailTheme">
    <EHtml>
      <EHead />
      <EBody>
        <EText class="text-primary">Concrete email color</EText>
      </EBody>
    </EHtml>
  </ETailwind>
</template>
```

Sharing the token source keeps web and email colors aligned without coupling server email rendering to the Nuxt CSS build.

The render path is filesystem-free: `ETailwind` accepts `config`, `theme`, and `utility` values, but it does not resolve arbitrary CSS file imports or CSS `@plugin` module imports while rendering. Supply executable Tailwind plugins through `config`.

```vue
<ETailwind>
  <EHtml>
    <EHead />
    <EBody class="bg-gray-100">
      <EContainer class="p-4">
        <EText class="text-red-500">Styled with Tailwind</EText>
      </EContainer>
    </EBody>
  </EHtml>
</ETailwind>
```

### Classes inside nested components

Classes on elements written directly in the email template are inlined by a render-time VNode transform. Classes emitted *inside a nested component* — a component whose own render outputs the class-bearing markup — are handled too, so a reusable card or button component styled with Tailwind works exactly like inline markup:

```vue
<!-- Card.vue: a nested component -->
<template>
  <div class="bg-red-500 p-4 md:text-lg">
    <EText class="m-0">Title</EText>
    <EButton class="bg-blue-600 px-4 py-2" href="https://example.com">Open</EButton>
  </div>
</template>
```

```vue
<!-- Email template -->
<ETailwind>
  <EHtml>
    <EHead />
    <EBody>
      <Card />
    </EBody>
  </EHtml>
</ETailwind>
```

E* primitives with style logic (`EBody`, `EText`, `EButton`, `ESection`, `EContainer`, `ERow`, `ELink`, `EImg`, `EHr`) resolve their own Tailwind classes before running their margin/padding/Outlook derivation, so utilities behave identically whether the primitive is written inline or produced by a nested component. Plain HTML elements and structural primitives (`EHtml`, `EHeading`, `EColumn`) are inlined after render. Non-inlinable rules from nested classes (e.g. the `md:text-lg` above) still reach the `<head>` `<style>`, and the missing-`<head>` error still fires when such a class has nowhere to go.

Limitations: `ECodeInline`, `ECodeBlock`, `EMarkdown`, `EPreview`, and `EFont` do not treat a nested `class` as a Tailwind style target (their `class`/head semantics differ), nested `<ETailwind>` boundaries are not supported, and render-time CSS/`@plugin` filesystem imports are not resolved. Emails that do not use `<ETailwind>` are entirely unaffected — the nested support adds zero cost to them.

## Complete-document requirement

These primitives do not repair invalid template roots. A template must render exactly one `<html>` root and exactly one `<body>`:

```vue
<template>
  <EHtml>
    <EHead />
    <EBody>
      <EText>Complete email</EText>
    </EBody>
  </EHtml>
</template>
```

Fragments, text-only roots, body-only templates, multiple bodies, and multiple HTML roots fail with `EmailRenderError` preserving the underlying document error. See the [renderer contract](./renderer.md) and the generated [conformance report](./conformance/report.md).
