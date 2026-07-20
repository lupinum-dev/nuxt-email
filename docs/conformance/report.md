# React Email conformance report

Nuxt Email 0.1.0 is compared against React Email 6.9.0 and @react-email/render 2.1.0. Compatibility is reported per behavior; no global compatibility percentage is claimed.

## Summary

| Runnable | Passed | Failed | Unsupported React components |
| ---: | ---: | ---: | ---: |
| 30 | 30 | 0 | 5 |

Oracle source commit: `6eb428924c4c2774228a07cbec1977ad8898f143`  
Published package commit: `71656573fa24b09e48173ae2357bf712fcb401b6`  
Oracle SHA-256: `0a7b89e1d7e3df885db527ea68f4dbbbfdaa6d0bce3d200c80f416fa3e0a2a99`

## Classifications

| Classification | Total | Passed | Failed |
| --- | ---: | ---: | ---: |
| exact | 10 | 10 | 0 |
| intentional-divergence | 6 | 6 | 0 |
| normalized | 9 | 9 | 0 |
| semantic | 5 | 5 | 0 |
| unsupported | 5 | 0 | 0 |

## Supported components and utilities

| Nuxt component or utility | Cases | Passed | Failed |
| --- | ---: | ---: | ---: |
| BasicDocument | 1 | 1 | 0 |
| CompleteBasicEmail | 1 | 1 | 0 |
| EBody | 1 | 1 | 0 |
| EButton | 3 | 3 | 0 |
| EContainer | 1 | 1 | 0 |
| EHead | 1 | 1 | 0 |
| EHeading | 1 | 1 | 0 |
| EHr | 1 | 1 | 0 |
| EHtml | 1 | 1 | 0 |
| EImg | 1 | 1 | 0 |
| ELink | 1 | 1 | 0 |
| EPreview | 4 | 4 | 0 |
| ERow and EColumn | 1 | 1 | 0 |
| ESection | 1 | 1 | 0 |
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
| CodeBlock | packages/react-email/src/components/code-block | Syntax-highlighted code output is outside the focused v0.1 primitive set. |
| CodeInline | packages/react-email/src/components/code-inline | Inline code styling is outside the focused v0.1 primitive set. |
| Font | packages/react-email/src/components/font | Font loading behavior requires separate email-client evidence after v0.1. |
| Markdown | packages/react-email/src/components/markdown | Markdown parsing is not required for ordinary Vue SFC authoring in v0.1. |
| Tailwind | packages/react-email/src/components/tailwind | Tailwind is deferred until the post-v0.1 entry gate in the implementation plan is met. |

## Behavior cases

| Case | Nuxt component or utility | Classification | Status | Semantic checks |
| --- | --- | --- | --- | ---: |
| basic-document | BasicDocument | normalized | passed | 3 |
| body-reset | EBody | semantic | passed | 3 |
| button-asymmetric | EButton | normalized | passed | 3 |
| button-asymmetric-text | renderPlainText with EButton | exact | passed | 1 |
| button-no-padding | EButton | normalized | passed | 3 |
| button-padding | EButton | normalized | passed | 3 |
| complete-basic-email | CompleteBasicEmail | semantic | passed | 4 |
| complete-basic-email-text | renderPlainText | exact | passed | 2 |
| container-padding | EContainer | normalized | passed | 3 |
| head-content | EHead | normalized | passed | 3 |
| heading-style | EHeading | normalized | passed | 2 |
| horizontal-rule-overrides | EHr | semantic | passed | 3 |
| html-defaults | EHtml | intentional-divergence | passed | 3 |
| image-overrides | EImg | semantic | passed | 3 |
| link-overrides | ELink | semantic | passed | 4 |
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
