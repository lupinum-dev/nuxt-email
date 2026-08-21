# React Email conformance report

Nuxt Email 1.0.0-beta.1 is compared against React Email 6.9.0 and @react-email/render 2.1.0. Compatibility is reported per behavior; no global compatibility percentage is claimed.

## Summary

| Runnable | Passed | Failed | Unsupported React components |
| ---: | ---: | ---: | ---: |
| 57 | 57 | 0 | 1 |

Oracle source commit: `6eb428924c4c2774228a07cbec1977ad8898f143`  
Published package commit: `71656573fa24b09e48173ae2357bf712fcb401b6`  
Oracle SHA-256: `dbaa8433377c15cc029d3f42c943a87cbfa42e17e411e738e2deddeb26e5b768`

## Classifications

| Classification | Total | Passed | Failed |
| --- | ---: | ---: | ---: |
| exact | 10 | 10 | 0 |
| intentional-divergence | 9 | 9 | 0 |
| normalized | 34 | 34 | 0 |
| semantic | 4 | 4 | 0 |
| unsupported | 1 | 0 | 0 |

## Supported components and utilities

| Nuxt component or utility | Cases | Passed | Failed |
| --- | ---: | ---: | ---: |
| BasicDocument | 1 | 1 | 0 |
| CompleteBasicEmail | 1 | 1 | 0 |
| EBody | 1 | 1 | 0 |
| EButton | 3 | 3 | 0 |
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
| code-inline-basic | passed | The hidden Orange.fr compatibility copy is excluded from recipient plain text. |
| code-inline-no-class | passed | The hidden Orange.fr compatibility copy is excluded from recipient plain text. |
| html-defaults | passed | EHtml requires a non-empty lang value instead of silently defaulting to English. Vue SSR also does not inject React 19's implicit empty head into a standalone html element. |
| link-overrides | passed | ELink keeps target="_blank" but adds no color or text-decoration defaults, so application styles remain the single visual source of truth. |
| preview-max-length | passed | EPreview omits React 19 title output and keeps hiding and plain-text exclusion invariant because Vue SSR cannot safely hoist title into head. |
| preview-short | passed | React 19 hoists Preview title output into head; Vue authors place title explicitly in EHead. EPreview also keeps hiding styles and data-skip-in-text fixed so user attributes cannot expose filler. |
| preview-style-override | passed | React replaces all hiding styles when a user style is provided; EPreview retains the hiding defaults as an email-safety invariant. |
| preview-unicode-boundary | passed | React truncates at 200 UTF-16 code units and can split a surrogate pair; EPreview drops the whole boundary code point and fills the remaining preview position. |
| row-columns | passed | EColumn omits React Email's internal data-id marker because no Vue behavior consumes it. |

## Unsupported React Email components

| React component | Reference | Reason |
| --- | --- | --- |
| CodeBlock | packages/react-email/src/components/code-block/code-block.tsx | `ECodeBlock` is an opt-in divergence that uses configured Shiki language entrypoints and inline theme colors instead of React Email's bundled Prism registry and runtime theme object. |

## Additional behavioral divergences and notes

- **EMarkdown container drops `data-id`.** React Email wraps Markdown output in `<div data-id="react-email-markdown">`; EMarkdown omits the marker, the same no-data-id divergence recorded for EColumn above. Each markdown case strips the marker from the oracle before the normalized full-document comparison.
- **EMarkdown rejects active content.** Unlike the pinned React Email implementation, EMarkdown rejects raw HTML and URL schemes outside `http`, `https`, `mailto`, `tel`, and `cid` (relative URLs remain valid). HTML-looking code spans and fences are escaped. This deliberate safety divergence prevents Markdown content from becoming an implicit raw-HTML escape hatch.
- **Presentation tables reject fixed attributes.** ESection, EContainer, and ERow throw a `TypeError` when passed `border`, `cellpadding`, `cellspacing`, or `role`. React Email silently discards these overrides; nuxt-email fails loudly to keep the email-client-safe table layout an invariant.
- **Only inline/static presentation-table padding can move to a cell.** Physical padding already known at render time — author `style` and non-variant Tailwind utilities — moves from ESection, EContainer, and ERow tables to a `<td>`. Responsive or pseudo-class padding remains a media/pseudo rule on the table because there is no inline value to relocate. For clients that force collapsed table borders, put responsive padding on an inner EColumn (a real `<td>`) instead.
- **ECodeInline excludes its compatibility copy from plain text.** HTML retains the hidden Orange.fr fallback span, but `renderPlainText` skips that copy so recipients receive the code once. React Email emits it twice.
- **ETailwind moves non-inlinable rules to `<head>`.** Media-query and pseudo-class rules that cannot be inlined are collected into a `<style>` element in the document `<head>` (an `<EHead>` inside `<ETailwind>` is required, otherwise rendering throws), residual class names are sanitized, and `mso-*` style properties survive inlining. Output tracks the pinned Tailwind version compiled by the engine.
- **ETailwind downlevels nesting and limits keyframes to the current render.** Tailwind v4 selector nesting and nested media/supports rules are recursively flattened because native email-client nesting support is low. Animation keyframes are included only when referenced; animation remains progressive enhancement rather than a compatibility guarantee.
- **Tailwind diagnostics use Vue component names.** The missing-head error preserves React Email's class ordering and remediation contract but names `<ETailwind>` and `<EHead />`, the components users can actually add.
- **ETailwind renders user components exactly once.** E* primitives with style-derived markup (Body, Text, Button, Section, Container, Row, Link, Img, Hr) resolve classes through the provided render context. After SSR, one marker-scoped pass handles native and structural elements and completes non-inlinable `<head>` CSS without re-invoking slots. ECodeInline, EMarkdown, EPreview, and EFont are excluded because their class/head semantics are not Tailwind style targets. Nested `<ETailwind>` boundaries are not supported.

## Behavior cases

| Case | Nuxt component or utility | Classification | Status | Semantic checks |
| --- | --- | --- | --- | ---: |
| basic-document | BasicDocument | normalized | passed | 3 |
| body-reset | EBody | semantic | passed | 3 |
| button-asymmetric | EButton | normalized | passed | 3 |
| button-asymmetric-text | renderPlainText with EButton | exact | passed | 1 |
| button-no-padding | EButton | normalized | passed | 3 |
| button-padding | EButton | normalized | passed | 3 |
| code-inline-basic | ECodeInline | intentional-divergence | passed | 3 |
| code-inline-no-class | ECodeInline | intentional-divergence | passed | 2 |
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
| link-overrides | ELink | intentional-divergence | passed | 4 |
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
