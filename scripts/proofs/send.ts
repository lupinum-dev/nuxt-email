/**
 * OPTIONAL live send of the PROOF KIT batch via Resend's HTTP API (no SDK — plain
 * `fetch`). Reads the artifacts produced by `generate.ts` from
 * `release-artifacts/proofs/` and POSTs each to https://api.resend.com/emails.
 *
 * Environment:
 *   RESEND_API_KEY    required to send.
 *   PROOF_RECIPIENTS  comma-separated destination addresses (required to send).
 *   PROOF_FROM        sender, default "Nuxt Email Proofs <proofs@example.invalid>".
 *                     Resend requires a verified sending domain — override this.
 *
 * Run: `node --import tsx scripts/proofs/send.ts` (or `pnpm proofs:send`).
 */
import type { ProofManifest } from './generate'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const proofToolingDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = dirname(dirname(proofToolingDir))
const proofsDir = join(repoRoot, 'release-artifacts/proofs')

const RESEND_ENDPOINT = 'https://api.resend.com/emails'
const DEFAULT_FROM = 'Nuxt Email Proofs <proofs@example.invalid>'

function parseRecipients(raw: string | undefined): string[] {
  return (raw ?? '')
    .split(',')
    .map(address => address.trim())
    .filter(address => address.length > 0)
}

async function loadManifest(): Promise<ProofManifest> {
  const raw = await readFile(join(proofsDir, 'manifest.json'), 'utf8')
  return JSON.parse(raw) as ProofManifest
}

interface SendPayload {
  from: string
  to: string[]
  subject: string
  html: string
  text: string
}

async function sendOne(apiKey: string, payload: SendPayload): Promise<void> {
  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(`Resend responded ${response.status} ${response.statusText}: ${detail}`)
  }

  const result = await response.json() as { id?: string }
  console.log(`    sent (Resend id: ${result.id ?? 'unknown'})`)
}

async function main(): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is required; no proof emails were sent')
  }

  const recipients = parseRecipients(process.env.PROOF_RECIPIENTS)
  if (recipients.length === 0) {
    throw new Error('PROOF_RECIPIENTS must contain at least one address; no proof emails were sent')
  }

  const from = process.env.PROOF_FROM ?? DEFAULT_FROM
  const manifest = await loadManifest()

  console.log(`Sending ${manifest.proofs.length} proof email(s) via Resend`)
  console.log(`  from:       ${from}`)
  console.log(`  recipients: ${recipients.join(', ')}`)
  console.log('')

  for (const proof of manifest.proofs) {
    const [html, text] = await Promise.all([
      readFile(join(proofsDir, proof.html), 'utf8'),
      readFile(join(proofsDir, proof.txt), 'utf8'),
    ])
    console.log(`  - ${proof.name} — subject: ${proof.subject}`)
    await sendOne(apiKey, { from, to: recipients, subject: proof.subject, html, text })
  }

  console.log('')
  console.log(`Done. ${manifest.proofs.length} proof email(s) dispatched to ${recipients.length} recipient(s).`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
