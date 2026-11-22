---
"@lupinum/nuxt-email": patch
---

Fix the `underline`, `no-underline` and `line-through` classes and the `EMarkdown` heading sizes in Outlook on Windows.

An inline style writes the line as `text-decoration` at its start instead of `text-decoration-line`, because Outlook on Windows reads only the shorthand. Before, a link with `no-underline` stayed underlined there, and `underline` had no effect. Other clients show the same result as before.

The default heading sizes of `EMarkdown` are `px` instead of `rem` (`40px` for a first-level heading), which is the same size at the default font size of 16 px. Outlook on Windows does not support `rem` and showed its default size.

Fix the condition of a `supports-[…]:` variant, which was written with `!important` and never matched.
