/**
 * Email-client PROOF KIT generator.
 *
 * Renders a representative email to `release-artifacts/proofs/`, writing
 * for each a `<name>.html`, a `<name>.txt`, and a valid RFC 5322 `.eml`
 * (multipart/alternative, quoted-printable, CRLF line endings) that opens cleanly
 * when double-clicked in Apple Mail / Outlook. A `manifest.json` describes the batch
 * so `send.ts` and the proof test can consume it without re-rendering.
 *
 * Run: `node --import tsx scripts/proofs/generate.ts` (or `pnpm proofs:generate`).
 */
import type { Component } from 'vue'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { defineComponent, h } from 'vue'
import {
  EBody,
  EButton,
  EColumn,
  EContainer,
  EFont,
  EHead,
  EHeading,
  EHr,
  EHtml,
  ELink,
  EMarkdown,
  EPreview,
  ERow,
  ESection,
  ETailwind,
  EText,
} from '../../src/runtime/components'
import { defineEmail } from '../../src/runtime/render/define-email'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'

const proofToolingDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(proofToolingDir))

// Fixed timestamp so the batch is byte-reproducible across runs (no churn in Date /
// Message-ID). 2026-07-20 is a Monday.
const PROOF_DATE = new Date(Date.UTC(2026, 6, 20, 0, 0, 0))
const PROOF_FROM = 'proofs@example.invalid'
const PROOF_TO = 'proofs@example.invalid'

// A single constant boundary is safe: it contains `=`, which quoted-printable always
// encodes as `=3D`, so the delimiter can never appear in encoded body content. Kept
// short so the Content-Type header stays within the RFC 5322 78-char recommendation.
const PROOF_BOUNDARY = '----=_NuxtEmailProofBoundary'

export interface ProofResult {
  name: string
  subject: string
  html: string
  txt: string
  eml: string
  htmlBytes: number
  textBytes: number
}

export interface ProofManifest {
  generatedAt: string
  from: string
  to: string
  proofs: Array<Omit<ProofResult, 'html' | 'txt' | 'eml'> & {
    html: string
    txt: string
    eml: string
  }>
}

// ---------------------------------------------------------------------------
// MIME encoder (RFC 2045 quoted-printable, RFC 2047 encoded-word, RFC 5322 message).
// ---------------------------------------------------------------------------

/** Soft-wrap already-encoded QP tokens so no physical line exceeds 76 chars (incl. the trailing `=`). */
function softWrapQuotedPrintable(tokens: readonly string[]): string {
  let result = ''
  let lineLength = 0
  for (const token of tokens) {
    // A soft line break is `=` + CRLF; keep room for it by capping at 75.
    if (lineLength + token.length > 75) {
      result += '=\r\n'
      lineLength = 0
    }
    result += token
    lineLength += token.length
  }
  return result
}

/**
 * Encode UTF-8 text as quoted-printable. Logical newlines become hard CRLF breaks;
 * every other line is soft-wrapped to the 76-char limit. Trailing spaces/tabs are
 * encoded so they survive transport.
 */
export function encodeQuotedPrintable(input: string): string {
  const logicalLines = input.replace(/\r\n?/g, '\n').split('\n')
  const encodedLines = logicalLines.map((line) => {
    const bytes = Buffer.from(line, 'utf8')
    const tokens: string[] = []
    for (const byte of bytes) {
      if (byte === 0x3D) {
        tokens.push('=3D')
      }
      else if (byte === 0x20 || byte === 0x09 || (byte >= 0x21 && byte <= 0x7E)) {
        // Printable ASCII (and space/tab, fixed up below if trailing).
        tokens.push(String.fromCharCode(byte))
      }
      else {
        tokens.push(`=${byte.toString(16).toUpperCase().padStart(2, '0')}`)
      }
    }
    // A space or tab at end of a line must be encoded, or it is stripped in transit.
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i] === ' ') tokens[i] = '=20'
      else if (tokens[i] === '\t') tokens[i] = '=09'
      else break
    }
    return softWrapQuotedPrintable(tokens)
  })
  return encodedLines.join('\r\n')
}

/**
 * Encode a Subject header value. Pure ASCII (with no control chars) passes through
 * unchanged; anything else is RFC 2047 base64 encoded-word(s), split on code-point
 * boundaries so no encoded-word exceeds 75 chars and no multi-byte character is torn.
 */
export function encodeSubjectHeader(subject: string): string {
  const isPlainAscii = /^[\x20-\x7E]*$/.test(subject)
  if (isPlainAscii) {
    return subject
  }

  // `=?utf-8?B?` + payload + `?=` — the 12 fixed chars leave 63 for base64; cap the
  // per-word UTF-8 payload at 45 bytes (base64 -> 60 chars, total 72 <= 75).
  const maxBytesPerWord = 45
  const words: string[] = []
  let chunk: number[] = []
  let chunkBytes = 0
  const flush = (): void => {
    if (chunk.length === 0) return
    const base64 = Buffer.from(chunk).toString('base64')
    words.push(`=?utf-8?B?${base64}?=`)
    chunk = []
    chunkBytes = 0
  }
  for (const character of subject) {
    const characterBytes = [...Buffer.from(character, 'utf8')]
    if (chunkBytes + characterBytes.length > maxBytesPerWord) {
      flush()
    }
    chunk.push(...characterBytes)
    chunkBytes += characterBytes.length
  }
  flush()

  // Fold multiple encoded-words with CRLF + single space (RFC 5322 header folding).
  return words.join('\r\n ')
}

/** Format a Date as an RFC 5322 date-time using a numeric UTC offset. */
export function formatRfc5322Date(date: Date): string {
  return date.toUTCString().replace(/GMT$/, '+0000')
}

export interface BuildEmlOptions {
  subject: string
  html: string
  text: string
  from?: string
  to?: string
  date?: Date
  messageId: string
}

/**
 * Hand-assemble an RFC 5322 message with a `multipart/alternative` body (plain text
 * first, HTML second so conformant clients prefer the HTML). All line endings are
 * CRLF. The {@link PROOF_BOUNDARY} contains `=`, which quoted-printable always encodes
 * as `=3D`, so the delimiter can never collide with encoded body content.
 */
export function buildEml(options: BuildEmlOptions): string {
  const {
    subject,
    html,
    text,
    from = PROOF_FROM,
    to = PROOF_TO,
    date = PROOF_DATE,
    messageId,
  } = options

  const boundary = PROOF_BOUNDARY
  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${encodeSubjectHeader(subject)}`,
    `Date: ${formatRfc5322Date(date)}`,
    `Message-ID: <${messageId}@example.invalid>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  const body = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    encodeQuotedPrintable(text),
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    encodeQuotedPrintable(html),
    `--${boundary}--`,
    '',
  ]
  return [...headers, '', ...body].join('\r\n')
}

const slot = (children: unknown) => ({ default: () => children })

/**
 * Dedicated proof template exercising every client-risk area in one email:
 * defineEmail subject, EPreview preheader, EFont webfont, ETailwind with a responsive
 * media query (`sm:`) and a dark-mode variant (`dark:`), an MSO-padded EButton, a
 * Section/Row/Column table layout and EMarkdown.
 */
const ProofKitEmail = defineComponent({
  name: 'ProofKitEmail',
  props: {
    firstName: { type: String, required: true },
    dashboardUrl: { type: String, required: true },
  },
  setup(props) {
    defineEmail({
      // Em dash is non-ASCII -> exercises the RFC 2047 encoded-word subject path.
      subject: () => `Proof kit — every client-risk area (${props.firstName})`,
    })

    return () => {
      const font = h(EFont, {
        fontFamily: 'Inter',
        fallbackFontFamily: ['Helvetica', 'sans-serif'],
        webFont: { url: 'https://fonts.example.invalid/inter.woff2', format: 'woff2' },
      })

      const heading = h(EHeading, {
        class: 'text-2xl sm:text-3xl dark:text-white',
        style: { color: '#17211c', margin: '0 0 16px' },
      }, slot(`Hello, ${props.firstName}`))

      const intro = h(EText, {
        class: 'text-base dark:text-gray-200',
        style: { color: '#415148', lineHeight: '26px', margin: '0 0 24px' },
      }, slot('This proof exercises every rendering risk area in a single email.'))

      const layoutRow = h(ESection, { style: { padding: '0 0 24px' } }, slot(
        h(ERow, null, slot([
          h(EColumn, { style: { color: '#607067', fontSize: '13px' } }, slot('Table layout: left column')),
          h(EColumn, { style: { color: '#607067', fontSize: '13px', textAlign: 'right' } }, slot('right column')),
        ])),
      ))

      const button = h(ESection, { style: { padding: '0 0 28px' } }, slot(
        h(EButton, {
          href: props.dashboardUrl,
          style: {
            backgroundColor: '#16794d',
            borderRadius: '6px',
            color: '#ffffff',
            fontSize: '15px',
            fontWeight: '700',
            padding: '13px 20px',
          },
        }, slot('Open your workspace')),
      ))

      const markdown = h(EMarkdown, {
        source: [
          '## Markdown block',
          '',
          'Spacing and **bold** plus a list:',
          '',
          '- first item',
          '- second item',
          '',
          'Inline `code` and a [link](https://example.invalid).',
        ].join('\n'),
      })

      const container = h(EContainer, {
        style: {
          backgroundColor: '#ffffff',
          border: '1px solid #d9dfdc',
          borderRadius: '12px',
          maxWidth: '600px',
          padding: '40px',
        },
      }, slot([
        heading,
        intro,
        layoutRow,
        button,
        h(EHr, { style: { borderTopColor: '#d9dfdc', margin: '0 0 24px' } }),
        markdown,
        h(EText, { style: { color: '#607067', fontSize: '13px', margin: '24px 0 0' } }, slot([
          'Questions? Email ',
          h(ELink, { href: 'mailto:proofs@example.invalid' }, slot('proofs@example.invalid')),
          '.',
        ])),
      ]))

      const body = h(EBody, {
        style: { backgroundColor: '#f3f5f4', fontFamily: 'Arial,sans-serif', padding: '32px 16px' },
      }, slot([
        h(EPreview, null, slot(`${props.firstName}, your proof batch is ready to inspect.`)),
        container,
      ]))

      return h(ETailwind, null, slot(
        h(EHtml, { lang: 'en' }, slot([
          h(EHead, null, slot(font)),
          body,
        ])),
      ))
    }
  },
})

interface ProofSpec {
  name: string
  component: Component
  props: Record<string, unknown>
  /** Used when the template does not declare a subject via defineEmail. */
  fallbackSubject: string
}

function proofSpecs(): ProofSpec[] {
  return [
    {
      name: 'proof-kit',
      component: ProofKitEmail,
      props: { firstName: 'Ada', dashboardUrl: 'https://example.invalid/workspaces/northstar' },
      fallbackSubject: 'Nuxt Email proof kit',
    },
  ]
}

async function renderProof(spec: ProofSpec): Promise<ProofResult> {
  const rendered = await renderEmailComponent(spec.component, spec.props)
  const subject = rendered.subject ?? spec.fallbackSubject
  const eml = buildEml({
    subject,
    html: rendered.html,
    text: rendered.text,
    messageId: `${spec.name}.${PROOF_DATE.getTime()}`,
  })
  return {
    name: spec.name,
    subject,
    html: rendered.html,
    txt: rendered.text,
    eml,
    htmlBytes: Buffer.byteLength(rendered.html, 'utf8'),
    textBytes: Buffer.byteLength(rendered.text, 'utf8'),
  }
}

export interface GenerateProofsOptions {
  /** Output directory; defaults to `<repo>/release-artifacts/proofs`. */
  outDir?: string
}

/**
 * Render the proof batch and write `<name>.html`, `<name>.txt`, `<name>.eml`, and a
 * `manifest.json` to the output directory. Returns the manifest.
 */
export async function generateProofs(options: GenerateProofsOptions = {}): Promise<ProofManifest> {
  const outDir = options.outDir ?? join(repoRoot, 'release-artifacts/proofs')
  await mkdir(outDir, { recursive: true })

  const specs = proofSpecs()
  const results: ProofResult[] = []
  for (const spec of specs) {
    const result = await renderProof(spec)
    await writeFile(join(outDir, `${result.name}.html`), result.html, 'utf8')
    await writeFile(join(outDir, `${result.name}.txt`), result.txt, 'utf8')
    // `latin1` writes the CRLF/quoted-printable bytes verbatim (the string is ASCII
    // by construction — all non-ASCII has been QP/base64 encoded).
    await writeFile(join(outDir, `${result.name}.eml`), result.eml, 'latin1')
    results.push(result)
  }

  const manifest: ProofManifest = {
    generatedAt: PROOF_DATE.toISOString(),
    from: PROOF_FROM,
    to: PROOF_TO,
    proofs: results.map(result => ({
      name: result.name,
      subject: result.subject,
      htmlBytes: result.htmlBytes,
      textBytes: result.textBytes,
      html: `${result.name}.html`,
      txt: `${result.name}.txt`,
      eml: `${result.name}.eml`,
    })),
  }
  await writeFile(join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  return manifest
}

async function main(): Promise<void> {
  const manifest = await generateProofs()
  const outDir = join(repoRoot, 'release-artifacts/proofs')
  console.log(`Wrote ${manifest.proofs.length} proof emails to ${outDir}:`)
  for (const proof of manifest.proofs) {
    console.log(
      `  - ${proof.name}: ${proof.html}, ${proof.txt}, ${proof.eml} `
      + `(html ${proof.htmlBytes} B, text ${proof.textBytes} B) — subject: ${proof.subject}`,
    )
  }
  console.log('manifest.json written. Next: docs/release/client-qa-checklist.md, or pnpm proofs:send.')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
