import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { ProofManifest } from '../../scripts/generate-proofs'
import {
  buildEml,
  encodeQuotedPrintable,
  encodeSubjectHeader,
  generateProofs,
} from '../../scripts/generate-proofs'

const CRLF = '\r\n'

describe('quoted-printable encoder', () => {
  it('passes printable ASCII through and encodes "=" and non-ASCII bytes', () => {
    expect(encodeQuotedPrintable('a=b')).toBe('a=3Db')
    // "é" is 0xC3 0xA9 in UTF-8.
    expect(encodeQuotedPrintable('é')).toBe('=C3=A9')
  })

  it('preserves hard line breaks as CRLF', () => {
    expect(encodeQuotedPrintable('one\ntwo')).toBe(`one${CRLF}two`)
  })

  it('encodes trailing whitespace so it survives transport', () => {
    expect(encodeQuotedPrintable('trailing ')).toBe('trailing=20')
  })

  it('soft-wraps physical lines to the 76-char limit', () => {
    const encoded = encodeQuotedPrintable('x'.repeat(200))
    for (const physicalLine of encoded.split(CRLF)) {
      expect(physicalLine.length).toBeLessThanOrEqual(76)
    }
    // Soft breaks reassemble to the original run of characters.
    expect(encoded.replace(/=\r\n/g, '')).toBe('x'.repeat(200))
  })
})

describe('subject header encoder', () => {
  it('passes plain ASCII through unchanged', () => {
    expect(encodeSubjectHeader('Welcome to Northstar')).toBe('Welcome to Northstar')
  })

  it('RFC 2047 base64 encodes non-ASCII, round-tripping the original text', () => {
    const subject = 'Proof kit — every risk area'
    const encoded = encodeSubjectHeader(subject)
    expect(encoded).toMatch(/^=\?utf-8\?B\?.+\?=$/)
    const base64 = encoded.replace(/^=\?utf-8\?B\?/, '').replace(/\?=$/, '')
    expect(Buffer.from(base64, 'base64').toString('utf8')).toBe(subject)
  })
})

describe('buildEml', () => {
  it('assembles a CRLF multipart/alternative message with text then html parts', () => {
    const eml = buildEml({
      subject: 'Hi',
      html: '<p>Hi</p>',
      text: 'Hi',
      messageId: 'unit-test',
    })

    expect(eml).toContain(`MIME-Version: 1.0${CRLF}`)
    expect(eml).toContain('Content-Type: multipart/alternative; boundary="')
    // Every line ends CRLF: there is no bare LF that is not preceded by CR.
    expect(/[^\r]\n/.test(eml)).toBe(false)

    const boundaryMatch = eml.match(/boundary="([^"]+)"/)
    expect(boundaryMatch).not.toBeNull()
    const boundary = boundaryMatch![1]!
    // Two body parts (opening delimiters) plus one closing delimiter.
    expect(eml.split(`--${boundary}`).length).toBe(4)
    expect(eml).toContain(`--${boundary}--${CRLF}`)

    const textIndex = eml.indexOf('Content-Type: text/plain')
    const htmlIndex = eml.indexOf('Content-Type: text/html')
    expect(textIndex).toBeGreaterThan(-1)
    expect(htmlIndex).toBeGreaterThan(textIndex)
  })
})

describe('generateProofs', () => {
  let outDir: string
  let manifest: ProofManifest

  beforeAll(async () => {
    outDir = await mkdtemp(join(tmpdir(), 'nuxt-email-proofs-'))
    manifest = await generateProofs({ outDir })
  })

  afterAll(async () => {
    await rm(outDir, { recursive: true, force: true })
  })

  it('renders the welcome and proof-kit emails', () => {
    expect(manifest.proofs.map(proof => proof.name)).toEqual(['welcome', 'proof-kit'])
    expect(manifest.from).toBe('proofs@example.invalid')
    expect(manifest.to).toBe('proofs@example.invalid')
  })

  it('writes html, txt and eml artifacts with sane byte sizes', async () => {
    for (const proof of manifest.proofs) {
      const [html, txt, eml] = await Promise.all([
        readFile(join(outDir, proof.html), 'utf8'),
        readFile(join(outDir, proof.txt), 'utf8'),
        readFile(join(outDir, proof.eml), 'latin1'),
      ])
      expect(html.startsWith('<!DOCTYPE')).toBe(true)
      expect(proof.htmlBytes).toBeGreaterThan(1000)
      expect(txt.length).toBeGreaterThan(0)
      // A complete multipart message is comfortably larger than its HTML part.
      expect(eml.length).toBeGreaterThan(proof.htmlBytes)
      expect(eml.length).toBeLessThan(proof.htmlBytes * 4)
    }
  })

  it('produces a structurally valid .eml (CRLF, boundaries, both MIME parts)', async () => {
    const eml = await readFile(join(outDir, 'proof-kit.eml'), 'latin1')

    expect(eml).toContain(`MIME-Version: 1.0${CRLF}`)
    expect(eml).toContain('Content-Type: multipart/alternative; boundary="')
    expect(eml).toContain('Content-Type: text/plain; charset=utf-8')
    expect(eml).toContain('Content-Type: text/html; charset=utf-8')
    expect(eml).toContain('Content-Transfer-Encoding: quoted-printable')

    // CRLF everywhere: no bare LF.
    expect(/[^\r]\n/.test(eml)).toBe(false)

    // No physical line exceeds the RFC 5322 998-char hard limit (and stays within the
    // 78-char recommendation the generator targets).
    for (const physicalLine of eml.split(CRLF)) {
      expect(physicalLine.length).toBeLessThanOrEqual(78)
    }

    const boundary = eml.match(/boundary="([^"]+)"/)![1]!
    expect(eml).toContain(`--${boundary}--${CRLF}`)
  })

  it('base64 encodes the non-ASCII proof-kit subject and passes the ASCII welcome subject through', async () => {
    const proofKitEml = await readFile(join(outDir, 'proof-kit.eml'), 'latin1')
    const welcomeEml = await readFile(join(outDir, 'welcome.eml'), 'latin1')

    expect(proofKitEml).toMatch(/Subject: =\?utf-8\?B\?/)
    expect(welcomeEml).toContain('Subject: Welcome to Northstar')
  })
})
