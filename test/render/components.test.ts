import { mkdir, rm, writeFile } from 'node:fs/promises'
import { beforeAll, describe, expect, it } from 'vitest'
import { bundledPackages } from '../../src/compiler/build-templates'
import { buildEmails, bundleEmails, workDirectory } from './build'

interface ComponentCase {
  name: string
  body: string
  head?: string
  bodyClass?: string
}

// One case per registered component, each with classes that feed the component's own style logic.
const cases: ComponentCase[] = [
  { name: 'button', body: '<EButton href="https://example.com/go" class="rounded bg-blue-600 px-6 py-2 text-white">Go</EButton>' },
  { name: 'code-inline', body: '<EText>Run <ECodeInline class="rounded bg-slate-100 px-1 font-mono text-sm">pnpm i</ECodeInline></EText>' },
  { name: 'column', body: '<ERow><EColumn class="w-1/2 p-2 align-top">Left</EColumn><EColumn class="w-1/2 bg-slate-50 p-2">Right</EColumn></ERow>' },
  { name: 'container', body: '<EContainer class="max-w-xl bg-white px-8 py-4">Hello</EContainer>' },
  {
    name: 'font',
    head: '<EFont font-family="Inter" :fallback-font-family="[\'Arial\', \'sans-serif\']" :web-font="{ url: \'https://example.com/inter.woff2\', format: \'woff2\' }" :font-weight="600" />',
    body: '<EText class="font-semibold">Inter text</EText>',
  },
  { name: 'heading', body: '<EHeading as="h2" class="mx-0 my-6 text-xl font-semibold">Title</EHeading>' },
  { name: 'hr', body: '<EHr class="my-8 border-t-2 border-solid border-slate-300" />' },
  { name: 'img', body: '<EImg src="https://example.com/logo.png" alt="Logo" width="120" class="mx-auto block rounded-full" />' },
  { name: 'link', body: '<ELink href="https://example.com/docs" class="text-blue-600 underline">Docs</ELink> <ELink href="https://example.com/self" target="_self" class="font-bold">Self</ELink>' },
  { name: 'markdown', body: '<EMarkdown class="text-slate-700" :source="\'# Hello\\n\\nSome **bold** text and a [link](https://example.com).\'" />' },
  { name: 'row', body: '<ERow class="bg-slate-50 px-4 py-2"><EColumn>Cell</EColumn></ERow>' },
  { name: 'section', body: '<ESection class="bg-white px-6 py-3 sm:px-10">Body</ESection>' },
  { name: 'text', body: '<EText class="my-2 text-base leading-6 text-slate-700">Paragraph</EText>' },
  {
    name: 'responsive-padding',
    body: '<ESection class="brand-box p-4 sm:p-8 sm:bg-slate-100">Section</ESection>'
      + '<EContainer class="px-4 md:px-10 md:bg-slate-100">Container</EContainer>'
      + '<ERow class="sm:px-6"><EColumn>Row</EColumn></ERow>',
  },
  {
    name: 'inline-content-on-own-lines',
    body: '<EText>Read the <ELink href="https://example.com/docs" class="underline">\n  Docs\n</ELink>. Run <ECodeInline>\n  pnpm i\n</ECodeInline>.</EText>',
  },
  { name: 'email-body', bodyClass: 'bg-slate-100 p-4 font-sans sm:p-8 sm:bg-white', body: '<EText>Body class</EText>' },
]

const directory = `${workDirectory}/cases`
const subject = 'Component case'

function caseTemplate(entry: ComponentCase): string {
  const bodyClass = entry.bodyClass ? ` class="${entry.bodyClass}"` : ''
  const head = entry.head ? `<template #head>${entry.head}</template>` : ''
  return `<template><EEmail subject="${subject}" lang="en"${bodyClass}>${head}${entry.body}</EEmail></template>\n`
}

let rendered: Map<string, string>
let bundle: string[]

beforeAll(async () => {
  await rm(directory, { recursive: true, force: true })
  await mkdir(`${directory}/templates`, { recursive: true })
  for (const entry of cases) {
    await writeFile(`${directory}/templates/${entry.name}.vue`, caseTemplate(entry))
  }
  // The cases keep custom class names on purpose, to pin how they pass through.
  const next = await buildEmails(`${directory}/templates`, { allowUnknownClasses: true })
  bundle = bundledPackages((await bundleEmails(`${directory}/templates`, 'cases')).metafile)
  rendered = new Map()
  for (const entry of cases) {
    rendered.set(entry.name, (await next.renderEmail(entry.name)).html)
  }
})

describe('components on the build-time Tailwind path', () => {
  it.each(cases.map(entry => entry.name))('%s matches its golden document', async (name) => {
    await expect(rendered.get(name)).toMatchFileSnapshot(`golden/${name}.html`)
  })
})

// A formatter puts the content of an inline component on its own lines, and Vue keeps each line
// break as a space. Inside a link that space is underlined and comes before the next character.
it('drops the whitespace at the edges of ELink and ECodeInline content', () => {
  const html = rendered.get('inline-content-on-own-lines')
  expect(html).toContain('>Docs</a>.')
  expect(html).toContain('>pnpm i</code>')
  expect(html).toContain('>pnpm i</span>.')
})

// A responsive padding class must reach the inner cell, where the layout component puts its
// padding; on the outer table its media rule would change nothing.
describe('responsive padding on layout components', () => {
  it('puts padding-only head classes on the inner cell and keeps other classes on the table', () => {
    const html = rendered.get('responsive-padding')!
    expect(html).toContain('role="presentation" class="brand-box sm_bg-slate-100"><tbody><tr><td class="sm_p-8" style="padding:16px;">Section</td>')
    expect(html).toContain('class="md_bg-slate-100" border="0" cellpadding="0" cellspacing="0" role="presentation" style="max-width:37.5em;"><tbody><tr style="width:100%;"><td class="md_px-10" style="padding-left:16px;padding-right:16px;">Container</td>')
  })

  it('puts every EEmail class on its inner cell and keeps all but padding-only ones on <body>', () => {
    expect(rendered.get('email-body')).toMatch(/<body class="sm_bg-white"[^>]*>.*<td dir="ltr" lang="en" class="sm_p-8 sm_bg-white" style="/)
  })

  it('gives ERow its wrapping cell for a cell class without inline padding', () => {
    expect(rendered.get('responsive-padding')).toContain('role="presentation"><tbody><tr><td class="sm_px-6"><table align="center"')
  })
})

describe('production bundle with every registered component', () => {
  it('contains no Tailwind or CSS parser code', async () => {
    expect(bundle).not.toContain('tailwindcss')
    expect(bundle).not.toContain('css-tree')
    expect(bundle).toContain('marked')
  })
})
