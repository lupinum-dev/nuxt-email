---
"@lupinum/nuxt-email": patch
---

Fix the `underline`, `no-underline` and `line-through` classes and the `EMarkdown` heading sizes in Outlook on Windows.

The build writes `text-decoration` instead of `text-decoration-line` in inline styles, because Outlook on Windows reads only the shorthand. Before, a link with `no-underline` stayed underlined there, and `underline` had no effect.

The default heading sizes of `EMarkdown` are `px` instead of `rem` (`40px` for a first-level heading), with the same size in other clients. Outlook on Windows does not support `rem` and showed its default size.

Fix the condition of a `supports-[…]:` variant, which was written with `!important` and never matched.
