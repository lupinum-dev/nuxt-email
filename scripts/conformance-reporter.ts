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
