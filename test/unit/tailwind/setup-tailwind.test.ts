import { expect, test } from 'vitest'
import { setupTailwind } from '../../../src/compiler/tailwind/setup-tailwind'

test('setupTailwind() builds the CSS for its candidates', async () => {
  const build = await setupTailwind()

  expect(build(['text-red-500', 'sm:bg-blue-300', 'bg-slate-900'])).toMatchInlineSnapshot(
    `
    "/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */
    @layer theme, base, components, utilities;
    @layer utilities {
      .bg-slate-900 {
        background-color: oklch(20.8% 0.042 265.755);
      }
      .text-red-500 {
        color: oklch(63.7% 0.237 25.331);
      }
      @media (width >= 40rem) {
        .sm\\:bg-blue-300 {
          background-color: oklch(80.9% 0.105 251.813);
        }
      }
    }
    "
  `,
  )

  expect(build(['bg-red-100'])).toMatchInlineSnapshot(
    `
    "/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */
    @layer theme, base, components, utilities;
    @layer utilities {
      .bg-red-100 {
        background-color: oklch(93.6% 0.032 17.717);
      }
      .bg-slate-900 {
        background-color: oklch(20.8% 0.042 265.755);
      }
      .text-red-500 {
        color: oklch(63.7% 0.237 25.331);
      }
      @media (width >= 40rem) {
        .sm\\:bg-blue-300 {
          background-color: oklch(80.9% 0.105 251.813);
        }
      }
    }
    "
  `,
  )
})

test.each(['@plugin "./plugin.js";', '@config "./tailwind.config.js";'])('rejects JavaScript imports in custom CSS: %s', async (css) => {
  await expect(setupTailwind(css)).rejects.toThrowError(/module imports are not supported in email Tailwind CSS/)
})
