---
"@lupinum/nuxt-email": patch
---

Fix conditional and child utility styles with the current Tailwind compiler, and fail instead of dropping unsupported conditions.

`ETailwind` keeps media-query, pseudo-class, child (`*:`, `**:`) and arbitrary selector variants such as `[:where(&)]:` with their conditions. Supported wrappers around a utility are `@media` and `@supports` (`@layer` is ignored). A utility inside any other at-rule now throws, for example `@container` variants (`@sm:`) or custom CSS in the `ETailwind` `utility` prop that wraps a class in `@scope` or `@container`. It throws `Unable to render Tailwind CSS: @<name> rules are not supported.` Before, the condition was dropped silently and the style applied everywhere.

Migration: remove `@container` variants (`@sm:`, `@md:` and so on) from email templates, and move custom CSS in the `ETailwind` `utility` prop out of `@container`, `@scope` and other unsupported at-rules, or rewrite the condition with `@media` or `@supports`.
