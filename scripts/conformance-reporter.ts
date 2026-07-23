import type { Reporter, TestCase, TestRunEndReason } from 'vitest/node'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

type Classification = 'exact' | 'normalized' | 'semantic' | 'intentional-divergence'

interface OracleCase {
  classification: Classification
  intentionalDivergence?: string
  nuxtComponent: string
  reactReference: string
  semanticAssertions: string[]
}

interface UnsupportedSurface {
  id: string
  reactComponent: string
  reactReference: string
  reason: string
}

interface OracleManifest {
  oracle: Record<string, string>
  cases: Record<string, OracleCase>
  unsupported: UnsupportedSurface[]
}

interface TaggedResult {
  file: string
  name: string
  passed: boolean
}

const REPORT_MODE = process.env.NUXT_EMAIL_CONFORMANCE_REPORT
const ROOT_PATH = fileURLToPath(new URL('..', import.meta.url))
const ORACLE_PATH = fileURLToPath(new URL('../test/conformance/oracle/react-email-6.9.0.json', import.meta.url))
const PACKAGE_PATH = fileURLToPath(new URL('../package.json', import.meta.url))
const JSON_REPORT_PATH = fileURLToPath(new URL('../docs/conformance/report.json', import.meta.url))
const MARKDOWN_REPORT_PATH = fileURLToPath(new URL('../docs/conformance/report.md', import.meta.url))
const TAG_PREFIX = 'conformance:'

function compareCodePoints(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1
}

function markdownCell(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', '<br>')
}

function buildReports(results: Map<string, TaggedResult>): { json: string, markdown: string } {
  const oracleSource = readFileSync(ORACLE_PATH, 'utf8')
  const manifest = JSON.parse(oracleSource) as OracleManifest
  const packageManifest = JSON.parse(readFileSync(PACKAGE_PATH, 'utf8')) as { version: string }
  const caseIds = Object.keys(manifest.cases).sort(compareCodePoints)
  const missingCases = caseIds.filter(caseId => !results.has(caseId))
  const unknownCases = [...results.keys()].filter(caseId => !(caseId in manifest.cases)).sort(compareCodePoints)

  if (missingCases.length > 0 || unknownCases.length > 0) {
    throw new Error([
      missingCases.length > 0 ? `Missing tagged conformance cases: ${missingCases.join(', ')}` : undefined,
      unknownCases.length > 0 ? `Unknown tagged conformance cases: ${unknownCases.join(', ')}` : undefined,
    ].filter(Boolean).join('. '))
  }

  const classificationCounts: Record<string, { failed: number, passed: number, total: number }> = {}
  const componentCounts: Record<string, { failed: number, passed: number, total: number }> = {}
  const cases = caseIds.map((id) => {
    const definition = manifest.cases[id]!
    const result = results.get(id)!
    const classification = classificationCounts[definition.classification] ??= { failed: 0, passed: 0, total: 0 }
    const component = componentCounts[definition.nuxtComponent] ??= { failed: 0, passed: 0, total: 0 }
    classification.total++
    component.total++
    increment(classification, result.passed ? 'passed' : 'failed')
    increment(component, result.passed ? 'passed' : 'failed')

    return {
      id,
      classification: definition.classification,
      status: result.passed ? 'passed' : 'failed',
      nuxtComponent: definition.nuxtComponent,
      reactReference: definition.reactReference,
      semanticAssertions: definition.semanticAssertions,
      ...(definition.intentionalDivergence === undefined
        ? {}
        : { intentionalDivergence: definition.intentionalDivergence }),
      test: {
        file: result.file,
        name: result.name,
      },
    }
  })
  const failed = cases.filter(conformanceCase => conformanceCase.status === 'failed').length
  const unsupported = [...manifest.unsupported].sort((left, right) => compareCodePoints(left.id, right.id))
  classificationCounts.unsupported = { failed: 0, passed: 0, total: unsupported.length }

  const report = {
    schemaVersion: 1,
    nuxtEmailVersion: packageManifest.version,
    oracle: manifest.oracle,
    oracleSha256: createHash('sha256').update(oracleSource).digest('hex'),
    summary: {
      failed,
      passed: cases.length - failed,
      runnable: cases.length,
      unsupported: unsupported.length,
    },
    classificationCounts,
    componentCounts,
    cases,
    intentionalDivergences: cases
      .filter(conformanceCase => conformanceCase.classification === 'intentional-divergence')
      .map(conformanceCase => ({
        id: conformanceCase.id,
        note: conformanceCase.intentionalDivergence,
        status: conformanceCase.status,
      })),
    unsupported,
  }
  const json = `${JSON.stringify(report, null, 2)}\n`
  const classificationRows = Object.entries(classificationCounts)
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([classification, counts]) => `| ${classification} | ${counts.total} | ${counts.passed} | ${counts.failed} |`)
  const componentRows = Object.entries(componentCounts)
    .sort(([left], [right]) => compareCodePoints(left, right))
    .map(([component, counts]) => `| ${markdownCell(component)} | ${counts.total} | ${counts.passed} | ${counts.failed} |`)
  const divergenceRows = report.intentionalDivergences
    .map(item => `| ${item.id} | ${item.status} | ${markdownCell(item.note ?? '')} |`)
  const unsupportedRows = unsupported
    .map(item => `| ${item.reactComponent} | ${markdownCell(item.reactReference)} | ${markdownCell(item.reason)} |`)
  const caseRows = cases.map((item) => {
    return `| ${item.id} | ${item.nuxtComponent} | ${item.classification} | ${item.status} | ${item.semanticAssertions.length} |`
  })
  // Divergences and notes that are not tied to a single case classification and therefore
  // cannot be derived from the oracle manifest. Kept here so the generated report remains the
  // single home for the divergence catalogue.
  const behavioralNotes = [
    '- **EMarkdown container drops `data-id`.** React Email wraps Markdown output in `<div data-id="react-email-markdown">`; EMarkdown omits the marker, the same no-data-id divergence recorded for EColumn above. Each markdown case strips the marker from the oracle before the normalized full-document comparison.',
    '- **EMarkdown rejects active content.** Unlike the pinned React Email implementation, EMarkdown rejects raw HTML and URL schemes outside `http`, `https`, `mailto`, `tel`, and `cid` (relative URLs remain valid). HTML-looking code spans and fences are escaped. This deliberate safety divergence prevents Markdown content from becoming an implicit raw-HTML escape hatch.',
    '- **Presentation tables reject fixed attributes.** ESection, EContainer, and ERow throw a `TypeError` when passed `border`, `cellpadding`, `cellspacing`, or `role`. React Email silently discards these overrides; nuxt-email fails loudly to keep the email-client-safe table layout an invariant.',
    '- **Only inline/static presentation-table padding can move to a cell.** Physical padding already known at render time — author `style` and non-variant Tailwind utilities — moves from ESection, EContainer, and ERow tables to a `<td>`. Responsive or pseudo-class padding remains a media/pseudo rule on the table because there is no inline value to relocate. For clients that force collapsed table borders, put responsive padding on an inner EColumn (a real `<td>`) instead.',
    '- **ECodeInline excludes its compatibility copy from plain text.** HTML retains the hidden Orange.fr fallback span, but `renderPlainText` skips that copy so recipients receive the code once. React Email emits it twice.',
    '- **ETailwind moves non-inlinable rules to `<head>`.** Media-query and pseudo-class rules that cannot be inlined are collected into a `<style>` element in the document `<head>` (a `<head>` inside `<Tailwind>` is required, otherwise rendering throws), residual class names are sanitized, and `mso-*` style properties survive inlining. Output tracks the pinned Tailwind version compiled by the engine.',
    '- **ETailwind reaches classes inside nested components.** The slot-visible subtree is inlined by a VNode transform, exactly as before. Classes emitted *inside* nested user components — which the transform never sees — are reached three ways: E* primitives with style logic (Body, Text, Button, Section, Container, Row, Link, Img, Hr) self-inline via provide/inject; plain HTML elements are inlined by a post-render, marker-scoped string pass that leaves every other byte (MSO conditional comments included) untouched; and the head `<style>` is completed post-render with the full non-inlinable CSS, including classes discovered only while nested components rendered. Structural/head-only primitives without style logic (EHtml, EHeading, EColumn) are handled by the same post-render plain-element pass; ECodeInline, ECodeBlock, EMarkdown, EPreview, and EFont are excluded (their `class`/head semantics are not Tailwind style targets). Nested `<Tailwind>` boundaries are not a supported configuration.',
  ].join('\n')
  const markdown = `# React Email conformance report

Nuxt Email ${packageManifest.version} is compared against React Email ${manifest.oracle.version} and @react-email/render ${manifest.oracle.rendererVersion}. Compatibility is reported per behavior; no global compatibility percentage is claimed.

## Summary

| Runnable | Passed | Failed | Unsupported React components |
| ---: | ---: | ---: | ---: |
| ${cases.length} | ${cases.length - failed} | ${failed} | ${unsupported.length} |

Oracle source commit: \`${manifest.oracle.sourceCheckoutCommit}\`  
Published package commit: \`${manifest.oracle.publishedPackageCommit}\`  
Oracle SHA-256: \`${report.oracleSha256}\`

## Classifications

| Classification | Total | Passed | Failed |
| --- | ---: | ---: | ---: |
${classificationRows.join('\n')}

## Supported components and utilities

| Nuxt component or utility | Cases | Passed | Failed |
| --- | ---: | ---: | ---: |
${componentRows.join('\n')}

## Intentional divergences

| Case | Status | Reason |
| --- | --- | --- |
${divergenceRows.join('\n')}

## Unsupported React Email components

| React component | Reference | Reason |
| --- | --- | --- |
${unsupportedRows.join('\n')}

## Additional behavioral divergences and notes

${behavioralNotes}

## Behavior cases

| Case | Nuxt component or utility | Classification | Status | Semantic checks |
| --- | --- | --- | --- | ---: |
${caseRows.join('\n')}
`

  if (failed > 0) {
    throw new Error(`Refusing to emit a passing conformance report with ${failed} failed behavior case${failed === 1 ? '' : 's'}`)
  }

  return { json, markdown }
}

function writeOrCheck(path: string, content: string): void {
  if (REPORT_MODE === 'write') {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content, 'utf8')
    return
  }
  if (REPORT_MODE === 'check') {
    const committed = readFileSync(path, 'utf8')
    if (committed !== content) {
      throw new Error(`Committed conformance report is stale: ${relative(ROOT_PATH, path)}`)
    }
    return
  }

  throw new TypeError('NUXT_EMAIL_CONFORMANCE_REPORT must be write or check')
}

export default class ConformanceReporter implements Reporter {
  private readonly results = new Map<string, TaggedResult>()

  onTestCaseResult(testCase: TestCase): void {
    for (const tag of testCase.tags) {
      if (!tag.startsWith(TAG_PREFIX)) {
        continue
      }

      const caseId = tag.slice(TAG_PREFIX.length)
      if (this.results.has(caseId)) {
        throw new Error(`Conformance case ${caseId} is tagged on more than one test`)
      }
      this.results.set(caseId, {
        file: testCase.module.relativeModuleId,
        name: testCase.fullName,
        passed: testCase.result().state === 'passed',
      })
    }
  }

  onTestRunEnd(_testModules: ReadonlyArray<unknown>, unhandledErrors: ReadonlyArray<unknown>, reason: TestRunEndReason): void {
    if (reason !== 'passed' || unhandledErrors.length > 0) {
      throw new Error('Refusing to generate conformance reports because the conformance test run did not pass')
    }

    const reports = buildReports(this.results)
    writeOrCheck(JSON_REPORT_PATH, reports.json)
    writeOrCheck(MARKDOWN_REPORT_PATH, reports.markdown)
  }
}
