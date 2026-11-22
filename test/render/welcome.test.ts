import { beforeAll, describe, expect, it } from 'vitest'
import { bundledPackages } from '../../src/compiler/build-templates'
import type { RenderedEmail } from '../../src/runtime/render-email'
import { buildEmails, bundleEmails, welcomeProps } from './build'

let compiled: Awaited<ReturnType<typeof buildEmails>>
let email: RenderedEmail

beforeAll(async () => {
  compiled = await buildEmails()
  email = await compiled.renderEmail('welcome', welcomeProps)
})

function element(pattern: RegExp): string {
  const match = pattern.exec(email.html)
  if (!match) throw new Error(`No element matches ${pattern}`)
  return match[0]
}

describe('welcome email on the build-time Tailwind path', () => {
  it('returns the subject prop as a string', () => {
    expect(email.subject).toBe('Welcome aboard, Ada')
  })

  it('moves inlinable classes into style on native elements', () => {
    expect(element(/<p[^>]*> Status line/)).toBe(
      '<p style="font-weight:700;color:#007a55;"> Status line',
    )
  })

  it('lets author style win over Tailwind', () => {
    expect(element(/<p[^>]*> Author style wins/)).toBe(
      '<p style="font-size:14px;line-height:1.4285714285714286;color:#123456;"> Author style wins',
    )
  })

  it('puts the parent class of a child component on its root as resolved style', () => {
    expect(element(/<div[^>]*> Your trial/)).toBe(
      '<div style="border-radius:6px;border-width:1px;border-style:solid;border-color:#ffd230;'
      + 'background-color:#fef3c6;padding:16px;"> Your trial',
    )
  })

  it('emits only the head rules of used classes and keeps their residual class', () => {
    expect(element(/<style>.*?<\/style>/)).toBe(
      '<style>@media (hover:hover){.hover_bg-blue-700:hover{background-color:#1447e6!important}}'
      + '@media (min-width:640px){.sm_text-lg{font-size:18px!important;line-height:1.5555555555555556!important}}</style>',
    )
    expect(element(/<p class="sm_text-lg"[^>]*>/)).toContain('font-size:14px;line-height:24px;color:#45556c;')
    expect(element(/<a [^>]*>/)).toContain('<a class="hover_bg-blue-700" href="https://example.com/activate"')
  })

  it('derives EButton Outlook spacers from px-5 py-3', () => {
    expect(email.html).toContain('padding-left:20px;padding-right:20px;padding-top:12px;padding-bottom:12px;')
    expect(email.html).toContain('<i style="mso-font-width:500%;mso-text-raise:18px" hidden>&#8202;&#8202;</i>')
    expect(email.html).toContain('<i style="mso-font-width:500%" hidden>&#8202;&#8202;&#8203;</i>')
    expect(email.html).toContain('mso-text-raise:9px;')
  })

  it('resolves a dynamic class on every render', async () => {
    const plain = await compiled.renderEmail('welcome', { ...welcomeProps, highlighted: false })
    expect(plain.html).toContain('<p style="color:#62748e;"> Status line')
  })
})

describe('whole documents', () => {
  // Whole-document goldens also pin head CSS order and how inline styles merge across components.
  it('renders the welcome email', async () => {
    await expect(email.html).toMatchFileSnapshot('golden/welcome.html')
  })

  it('renders the 48-row email', async () => {
    const large = await compiled.renderEmail('large', { payload: 'Ada', rows: 48 })
    await expect(large.html).toMatchFileSnapshot('golden/large-48.html')
  })
})

describe('production bundle', () => {
  it('contains no Tailwind or CSS parser code', async () => {
    const { metafile } = await bundleEmails()
    const packages = bundledPackages(metafile)
    expect(packages).not.toContain('tailwindcss')
    expect(packages).not.toContain('css-tree')
    // The bundle must still include real runtime code, or the check proves nothing.
    expect(Object.keys(metafile.inputs).some(input => input.endsWith('src/runtime/tw.ts'))).toBe(true)
  })
})
