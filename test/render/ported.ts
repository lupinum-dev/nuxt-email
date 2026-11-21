import { mkdir, rm, writeFile } from 'node:fs/promises'
import { beforeAll, expect } from 'vitest'
import { EmailRenderError } from '../../src/runtime/render/errors'
import type { RenderedEmail } from '../../src/runtime/render-email'
import { buildEmails, workDirectory } from './build'

/** One email on the build-time path. `body` is the content of `<EEmail>`, written as in a template. */
export interface PortedCase {
  name: string
  body: string
  /** Content of `<template #head>`. */
  head?: string
  /** Extra attributes on `<EEmail>`. */
  email?: string
  /** `lang` of `<EEmail>`; `null` leaves it out. Default `en`. */
  lang?: string | null
  /** Source of `<script setup lang="ts">`. */
  script?: string
  props?: Record<string, unknown>
  /** Substrings of the HTML. */
  contains?: string[]
  excludes?: string[]
  /** The exact plain text. */
  text?: string
  /** Pin the whole document as `golden/ported-<area>-<name>.html`. Default true. */
  golden?: boolean
}

export interface PortedErrorCase extends Omit<PortedCase, 'contains' | 'excludes' | 'text' | 'golden'> {
  /** The exact message of the error under `EmailRenderError.cause`. */
  cause: string
}

export function emailSource(entry: PortedCase | PortedErrorCase): string {
  const lang = entry.lang === null ? '' : ` lang="${entry.lang ?? 'en'}"`
  const script = entry.script === undefined ? '' : `<script setup lang="ts">\n${entry.script}\n</script>\n`
  const head = entry.head === undefined ? '' : `<template #head>${entry.head}</template>`
  return `${script}<template><EEmail subject="Ported"${lang}${entry.email === undefined ? '' : ` ${entry.email}`}>${head}${entry.body}</EEmail></template>\n`
}

async function compile(area: string, cases: (PortedCase | PortedErrorCase)[], files: Record<string, string>) {
  const directory = `${workDirectory}/ported/${area}`
  await rm(directory, { recursive: true, force: true })
  await mkdir(`${directory}/components`, { recursive: true })
  for (const entry of cases) await writeFile(`${directory}/${entry.name}.vue`, emailSource(entry))
  for (const [path, source] of Object.entries(files)) await writeFile(`${directory}/${path}`, source)
  return await buildEmails(directory)
}

/**
 * Compile the cases of one area into a template directory under `.tmp/tests/ported/`
 * and render each case twice before the tests run. `files` adds support files such as
 * `components/Name.vue`.
 */
export function renderPortedCases(area: string, cases: PortedCase[], files: Record<string, string> = {}) {
  const rendered = new Map<string, { email: RenderedEmail, again: RenderedEmail }>()
  beforeAll(async () => {
    const { renderEmail } = await compile(area, cases, files)
    for (const entry of cases) {
      rendered.set(entry.name, {
        email: await renderEmail(entry.name, entry.props),
        again: await renderEmail(entry.name, entry.props),
      })
    }
  })
  return rendered
}

/** The shared assertions of a table row: literals, exact text, one golden, identical repeated renders. */
export async function expectPortedCase(
  area: string,
  entry: PortedCase,
  rendered: ReturnType<typeof renderPortedCases>,
) {
  const { email, again } = rendered.get(entry.name)!
  expect(again).toEqual(email)
  for (const text of entry.contains ?? []) expect(email.html).toContain(text)
  for (const text of entry.excludes ?? []) expect(email.html).not.toContain(text)
  if (entry.text !== undefined) expect(email.text).toBe(entry.text)
  if (entry.golden !== false) await expect(email.html).toMatchFileSnapshot(`golden/ported-${area}-${entry.name}.html`)
}

/** Compile the failing templates of one area and return a function that renders one of them. */
export function renderPortedErrors(area: string, cases: PortedErrorCase[], files: Record<string, string> = {}) {
  let renderEmail: Awaited<ReturnType<typeof buildEmails>>['renderEmail']
  beforeAll(async () => {
    renderEmail = (await compile(`${area}-errors`, cases, files)).renderEmail
  })
  return async (entry: PortedErrorCase) => {
    const error = await renderEmail(entry.name, entry.props).catch((value: unknown) => value)
    expect(error).toBeInstanceOf(EmailRenderError)
    expect(error).toMatchObject({ message: `Failed to render email template ${entry.name}`, templateName: entry.name })
    expect(((error as EmailRenderError).cause as Error).message).toBe(entry.cause)
  }
}
