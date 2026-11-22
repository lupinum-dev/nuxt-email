---
"@lupinum/nuxt-email": patch
---

Fix the space inside `ELink` and `ECodeInline` when their content is on its own lines in the template.

A formatter such as the Nuxt ESLint style rules puts the content of these components on its own lines, and Vue keeps each line break as a space. The space was inside the link, so the underline ran past the last word and a space came before the next character. Both components now remove the whitespace at the start and the end of their content. A non-breaking space stays.
