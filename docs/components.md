# Component reference

Nuxt Email v0.1 provides fourteen E-prefixed components. They are auto-registered inside email templates and the isolated server renderer. All composition uses ordinary Vue slots; all attributes use Vue and HTML names rather than React prop aliases.

## Shared rules

- Native attributes and `class` are forwarded unless a component fixes an email-safety invariant.
- `style` accepts the normal Vue object, string, or array forms. Object keys may be camelCase or kebab-case.
- Vue interpolation and attribute serialization escape text by default.
- Every component rejects `innerHTML`, `textContent`, and attribute names beginning with `on`, case-insensitively. There is no raw-HTML primitive in v0.1.
- Event handlers have no place in rendered email and are not supported.
- Required strings such as `href` and `src` must be non-empty at runtime.
- React Email shorthand props such as `mx` are not supported; use ordinary CSS in `style`.

## Document components

| Component | Output and important props | Defaults and fixed behavior |
| --- | --- | --- |
| `EHtml` | Complete `<html>` root; accepts safe HTML attributes. | `lang="en"`, `dir="ltr"`. Every render must contain exactly one `EHtml` and one `EBody`. |
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
| `EContainer` | Centered presentation table for bounded content; accepts safe table attributes except the fixed semantics. | `width="100%"`, `max-width: 37.5em`; physical padding moves to the inner cell. `border`, `cellpadding`, `cellspacing`, and `role` are fixed. |
| `ESection` | Full-width presentation table with one inner cell. | Physical padding moves to the inner cell. Presentation-table attributes are fixed. |
| `ERow` | Full-width presentation table whose row receives slot content. | Place `EColumn` components directly in the slot. Presentation-table attributes are fixed. |
| `EColumn` | A `<td>` cell; accepts safe cell attributes such as `width`, `colspan`, alignment, and style. | No synthetic React marker and no default width. |

For `EContainer` and `ESection`, physical `padding`, `paddingTop`, `paddingRight`, `paddingBottom`, and `paddingLeft` are placed on the inner `<td>` for compatibility. Logical padding properties remain on the table.

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
