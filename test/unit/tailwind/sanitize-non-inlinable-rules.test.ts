import { generate } from 'css-tree'
import { describe, expect, it } from 'vitest'
import { sanitizeStyleSheet } from '../../../src/runtime/tailwind/engine/sanitize-stylesheet'
import { setupTailwind } from '../../../src/runtime/tailwind/engine/setup-tailwind'
import { sanitizeNonInlinableRules } from '../../../src/runtime/tailwind/engine/css/sanitize-non-inlinable-rules'

describe('sanitizeNonInlinableRules()', () => {
  it('inlines rules that can be inlined', async () => {
    const tailwind = await setupTailwind({})
    tailwind.addUtilities(['bg-gray-900', 'text-red-300', 'text-lg'])
    const stylesheet = tailwind.getStyleSheet()

    sanitizeNonInlinableRules(stylesheet)
    expect(generate(stylesheet)).toMatchInlineSnapshot(
      `"/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */@layer theme,base,components,utilities;@layer theme{:root,:host{--color-red-300: oklch(80.8% 0.114 19.571)!important;--color-gray-900: oklch(21% 0.034 264.665)!important;--text-lg: 1.125rem!important;--text-lg--line-height: calc(1.75 / 1.125)!important}}@layer utilities{.bg-gray-900{background-color:var(--color-gray-900)}.text-lg{font-size:var(--text-lg);line-height:var(--tw-leading, var(--text-lg--line-height))}.text-red-300{color:var(--color-red-300)}}"`,
    )
  })

  it('handles CSS nesting in hover pseudo styles', async () => {
    const tailwind = await setupTailwind({})
    tailwind.addUtilities([
      'hover:text-sky-600',
      'sm:focus:outline-none',
      'md:hover:bg-gray-100',
      'lg:focus:underline',
    ])

    const stylesheet = tailwind.getStyleSheet()

    sanitizeNonInlinableRules(stylesheet)
    expect(generate(stylesheet)).toMatchInlineSnapshot(
      `"/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */@layer theme,base,components,utilities;@layer theme{:root,:host{--color-sky-600: oklch(58.8% 0.158 241.966)!important;--color-gray-100: oklch(96.7% 0.003 264.542)!important}}@layer utilities{@media (hover:hover){.hover_text-sky-600:hover{color:var(--color-sky-600)!important}}@media (width>=40rem){.sm_focus_outline-none:focus{outline-style:none!important}}@media (width>=48rem){@media (hover:hover){.md_hover_bg-gray-100:hover{background-color:var(--color-gray-100)!important}}}@media (width>=64rem){.lg_focus_underline:focus{text-decoration-line:underline!important}}}"`,
    )
  })

  it('strips Tailwind v4 variant-stacking var() refs with empty fallbacks inside print: media queries', async () => {
    const tailwind = await setupTailwind({})
    tailwind.addUtilities(['md:block', 'print:invert'])
    const stylesheet = tailwind.getStyleSheet()

    sanitizeStyleSheet(stylesheet)
    sanitizeNonInlinableRules(stylesheet)
    const result = generate(stylesheet)

    expect(result).not.toMatch(/var\(--tw-[^,()]+,\s*\)/)
    expect(result).toMatchInlineSnapshot(
      `"/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */@layer theme,base,components,utilities;@layer utilities{@media (width>=48rem){.md_block{display:block!important}}@media print{.print_invert{filter:invert(100%)!important}}}@property --tw-blur{syntax:"*";inherits:false}@property --tw-brightness{syntax:"*";inherits:false}@property --tw-contrast{syntax:"*";inherits:false}@property --tw-grayscale{syntax:"*";inherits:false}@property --tw-hue-rotate{syntax:"*";inherits:false}@property --tw-invert{syntax:"*";inherits:false}@property --tw-opacity{syntax:"*";inherits:false}@property --tw-saturate{syntax:"*";inherits:false}@property --tw-sepia{syntax:"*";inherits:false}@property --tw-drop-shadow{syntax:"*";inherits:false}@property --tw-drop-shadow-color{syntax:"*";inherits:false}@property --tw-drop-shadow-alpha{syntax:"<percentage>";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:"*";inherits:false}"`,
    )
  })

  it('supports basic media query rules', async () => {
    const tailwind = await setupTailwind({})
    tailwind.addUtilities([
      'sm:mx-auto',
      'sm:max-w-lg',
      'sm:rounded-lg',
      'md:px-10',
      'md:py-12',
    ])
    const stylesheet = tailwind.getStyleSheet()

    sanitizeNonInlinableRules(stylesheet)

    expect(generate(stylesheet)).toMatchInlineSnapshot(
      `"/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */@layer theme,base,components,utilities;@layer theme{:root,:host{--spacing: 0.25rem!important;--container-lg: 32rem!important;--radius-lg: 0.5rem!important}}@layer utilities{@media (width>=40rem){.sm_mx-auto{margin-inline:auto!important}.sm_max-w-lg{max-width:var(--container-lg)!important}.sm_rounded-lg{border-radius:var(--radius-lg)!important}}@media (width>=48rem){.md_px-10{padding-inline:calc(var(--spacing)*10)!important}.md_py-12{padding-block:calc(var(--spacing)*12)!important}}}"`,
    )
  })
})
