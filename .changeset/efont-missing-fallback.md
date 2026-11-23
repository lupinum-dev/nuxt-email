---
'@lupinum/nuxt-email': patch
---

Fix `EFont` without `fallbackFontFamily`: the render now fails with an `EmailRenderError`.

Before, the render passed and wrote invalid CSS (`mso-font-alt: 'undefined'` and an empty entry in the font stack).
