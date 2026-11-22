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
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createTestRenderer } from '../../src/testing'

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

interface ProofSpec {
  /** Template name in `scripts/proofs/emails/`. */
  name: string
  props: Record<string, unknown>
}

const proofSpecs: ProofSpec[] = [
  { name: 'proof-kit', props: { firstName: 'Ada', dashboardUrl: 'https://example.invalid/workspaces/northstar' } },
]

async function renderProof(renderEmail: (name: string, props: Record<string, unknown>) => Promise<{ html: string, text: string, subject: string }>, spec: ProofSpec): Promise<ProofResult> {
  const rendered = await renderEmail(spec.name, spec.props)
  const eml = buildEml({
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    messageId: `${spec.name}.${PROOF_DATE.getTime()}`,
  })
  return {
    name: spec.name,
    subject: rendered.subject,
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

  const { renderEmail } = await createTestRenderer({ rootDir: proofToolingDir, templatesDir: 'emails' })
  const results: ProofResult[] = []
  for (const spec of proofSpecs) {
    const result = await renderProof(renderEmail, spec)
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
