# React Email conformance report

Nuxt Email 0.1.0 is compared against React Email 6.9.0 and @react-email/render 2.1.0. Compatibility is reported per behavior; no global compatibility percentage is claimed.

## Summary

| Runnable | Passed | Failed | Unsupported React components |
| ---: | ---: | ---: | ---: |
| 61 | 61 | 0 | 0 |

Oracle source commit: `6eb428924c4c2774228a07cbec1977ad8898f143`  
Published package commit: `71656573fa24b09e48173ae2357bf712fcb401b6`  
Oracle SHA-256: `2b641c670b290cdba25c7e43f4c4c7cfdb30ce7d9924c5b76830f768d76e3a4b`

## Classifications

| Classification | Total | Passed | Failed |
| --- | ---: | ---: | ---: |
| exact | 10 | 10 | 0 |
| intentional-divergence | 6 | 6 | 0 |
| normalized | 40 | 40 | 0 |
| semantic | 5 | 5 | 0 |
| unsupported | 0 | 0 | 0 |

## Supported components and utilities

| Nuxt component or utility | Cases | Passed | Failed |
| --- | ---: | ---: | ---: |
| BasicDocument | 1 | 1 | 0 |
| CompleteBasicEmail | 1 | 1 | 0 |
| EBody | 1 | 1 | 0 |
| EButton | 3 | 3 | 0 |
| ECodeBlock | 4 | 4 | 0 |
| ECodeInline | 2 | 2 | 0 |
| EContainer | 1 | 1 | 0 |
| EFont | 3 | 3 | 0 |
| EHead | 1 | 1 | 0 |
| EHeading | 1 | 1 | 0 |
| EHr | 1 | 1 | 0 |
| EHtml | 1 | 1 | 0 |
| EImg | 1 | 1 | 0 |
| ELink | 1 | 1 | 0 |
| EMarkdown | 5 | 5 | 0 |
| EPreview | 4 | 4 | 0 |
| ERow and EColumn | 1 | 1 | 0 |
| ESection | 1 | 1 | 0 |
| ETailwind | 17 | 17 | 0 |
| EText | 1 | 1 | 0 |
| renderPlainText | 9 | 9 | 0 |
| renderPlainText with EButton | 1 | 1 | 0 |

## Intentional divergences

| Case | Status | Reason |
| --- | --- | --- |
| html-defaults | passed | Vue SSR does not inject React 19's implicit empty head into a standalone html element. |
| preview-max-length | passed | EPreview omits React 19 title output and keeps hiding and plain-text exclusion invariant because Vue SSR cannot safely hoist title into head. |
| preview-short | passed | React 19 hoists Preview title output into head; Vue authors place title explicitly in EHead. EPreview also keeps hiding styles and data-skip-in-text fixed so user attributes cannot expose filler. |
| preview-style-override | passed | React replaces all hiding styles when a user style is provided; EPreview retains the hiding defaults as an email-safety invariant. |
| preview-unicode-boundary | passed | React truncates at 200 UTF-16 code units and can split a surrogate pair; EPreview drops the whole boundary code point and fills the remaining preview position. |
| row-columns | passed | EColumn omits React Email's internal data-id marker because no Vue behavior consumes it. |

## Unsupported React Email components

| React component | Reference | Reason |
| --- | --- | --- |


## Additional behavioral divergences and notes

- **EMarkdown container drops `data-id`.** React Email wraps Markdown output in `<div data-id="react-email-markdown">`; EMarkdown omits the marker, the same no-data-id divergence recorded for EColumn above. Each markdown case strips the marker from the oracle before the normalized full-document comparison.
- **Presentation tables reject fixed attributes.** ESection, EContainer, and ERow throw a `TypeError` when passed `border`, `cellpadding`, `cellspacing`, or `role`. React Email silently discards these overrides; nuxt-email fails loudly to keep the email-client-safe table layout an invariant.
- **ECodeInline duplicates content in plain text (matches React).** ECodeInline renders its content twice, a visible `<code>` and a hidden copy span, so `renderPlainText` emits the content twice. This is faithful to React Email and is noted only to prevent surprise; it is not a divergence.
- **ETailwind moves non-inlinable rules to `<head>`.** Media-query and pseudo-class rules that cannot be inlined are collected into a `<style>` element in the document `<head>` (a `<head>` inside `<Tailwind>` is required, otherwise rendering throws), residual class names are sanitized, and `mso-*` style properties survive inlining. Output tracks the pinned Tailwind version compiled by the engine.
- **ETailwind reaches classes inside nested components.** The slot-visible subtree is inlined by a VNode transform, exactly as before. Classes emitted *inside* nested user components — which the transform never sees — are reached three ways: E* primitives with style logic (Text, Button, Section, Container, Link, Img, Hr) self-inline via provide/inject; plain HTML elements are inlined by a post-render, marker-scoped string pass that leaves every other byte (MSO conditional comments included) untouched; and the head `<style>` is completed post-render with the full non-inlinable CSS, including classes discovered only while nested components rendered. Structural/head-only primitives without style logic (EHtml, EHeading, ERow, EColumn) are handled by the same post-render plain-element pass; ECodeInline, ECodeBlock, EMarkdown, EPreview, and EFont are excluded (their `class`/head semantics are not Tailwind style targets). Nested `<Tailwind>` boundaries are not a supported configuration.

## Behavior cases

| Case | Nuxt component or utility | Classification | Status | Semantic checks |
| --- | --- | --- | --- | ---: |
| basic-document | BasicDocument | normalized | passed | 3 |
| body-reset | EBody | semantic | passed | 3 |
| button-asymmetric | EButton | normalized | passed | 3 |
| button-asymmetric-text | renderPlainText with EButton | exact | passed | 1 |
| button-no-padding | EButton | normalized | passed | 3 |
| button-padding | EButton | normalized | passed | 3 |
| code-block-attributes | ECodeBlock | normalized | passed | 1 |
| code-block-basic | ECodeBlock | normalized | passed | 4 |
| code-block-css-lang | ECodeBlock | normalized | passed | 2 |
| code-block-line-numbers | ECodeBlock | normalized | passed | 2 |
| code-inline-basic | ECodeInline | normalized | passed | 3 |
| code-inline-no-class | ECodeInline | normalized | passed | 2 |
| complete-basic-email | CompleteBasicEmail | semantic | passed | 4 |
| complete-basic-email-text | renderPlainText | exact | passed | 2 |
| container-padding | EContainer | normalized | passed | 3 |
| font-defaults | EFont | normalized | passed | 3 |
| font-multiple-fallbacks | EFont | normalized | passed | 2 |
| font-webfont | EFont | normalized | passed | 2 |
| head-content | EHead | normalized | passed | 3 |
| heading-style | EHeading | normalized | passed | 2 |
| horizontal-rule-overrides | EHr | semantic | passed | 3 |
| html-defaults | EHtml | intentional-divergence | passed | 3 |
| image-overrides | EImg | semantic | passed | 3 |
| link-overrides | ELink | semantic | passed | 4 |
| markdown-container-and-attrs | EMarkdown | normalized | passed | 3 |
| markdown-custom-styles | EMarkdown | normalized | passed | 2 |
| markdown-document | EMarkdown | normalized | passed | 4 |
| markdown-links-escaping | EMarkdown | normalized | passed | 2 |
| markdown-nested-lists | EMarkdown | normalized | passed | 2 |
| plain-text-blockquote | renderPlainText | exact | passed | 1 |
| plain-text-breaks | renderPlainText | exact | passed | 2 |
| plain-text-links | renderPlainText | exact | passed | 3 |
| plain-text-nested-lists | renderPlainText | exact | passed | 2 |
| plain-text-ordered-start | renderPlainText | exact | passed | 2 |
| plain-text-preformatted | renderPlainText | exact | passed | 1 |
| plain-text-tables | renderPlainText | exact | passed | 3 |
| plain-text-unicode | renderPlainText | exact | passed | 1 |
| preview-max-length | EPreview | intentional-divergence | passed | 2 |
| preview-short | EPreview | intentional-divergence | passed | 3 |
| preview-style-override | EPreview | intentional-divergence | passed | 1 |
| preview-unicode-boundary | EPreview | intentional-divergence | passed | 1 |
| row-columns | ERow and EColumn | intentional-divergence | passed | 3 |
| section-padding | ESection | normalized | passed | 3 |
| text-margins | EText | normalized | passed | 4 |
| tw-author-style-precedence | ETailwind | normalized | passed | 1 |
| tw-basic-inlining | ETailwind | normalized | passed | 2 |
| tw-button-classes | ETailwind | normalized | passed | 2 |
| tw-column-classes | ETailwind | normalized | passed | 1 |
| tw-component-style-override | ETailwind | normalized | passed | 1 |
| tw-custom-theme | ETailwind | normalized | passed | 1 |
| tw-duplicate-classes | ETailwind | normalized | passed | 1 |
| tw-heading-classes | ETailwind | normalized | passed | 1 |
| tw-important | ETailwind | normalized | passed | 1 |
| tw-media-queries | ETailwind | normalized | passed | 3 |
| tw-mso-preserved | ETailwind | normalized | passed | 1 |
| tw-nested-component | ETailwind | normalized | passed | 4 |
| tw-pixel-preset | ETailwind | normalized | passed | 1 |
| tw-preserves-head-children | ETailwind | normalized | passed | 2 |
| tw-residual-class-sanitization | ETailwind | normalized | passed | 2 |
| tw-row-classes | ETailwind | normalized | passed | 1 |
| tw-section-padding | ETailwind | normalized | passed | 1 |
