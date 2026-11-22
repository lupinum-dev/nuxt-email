import { performance } from 'node:perf_hooks'
import { renderPlainText } from '../../src/runtime/render/plain-text'
import { buildEmails, welcomeProps } from '../render/build'

const WARM_ITERATIONS = 100
const LARGE_EMAIL_ROWS = 48
// Multi-byte text in every row, so escaping and the plain-text pass see realistic content.
const largeProps = { payload: 'é€👩🏽‍💻é 你好 مرحبا '.repeat(12), rows: LARGE_EMAIL_ROWS }

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[middle - 1]! + sorted[middle]!) / 2 : sorted[middle]!
}

async function measure(render: () => Promise<{ html: string, text: string }>) {
  const coldStart = performance.now()
  const expected = await render()
  const coldMilliseconds = performance.now() - coldStart
  const warm: number[] = []
  for (let iteration = 0; iteration < WARM_ITERATIONS; iteration++) {
    const start = performance.now()
    const result = await render()
    warm.push(performance.now() - start)
    if (result.html !== expected.html || result.text !== expected.text) throw new Error('Output changed between renders')
  }
  const text: number[] = []
  for (let iteration = 0; iteration < WARM_ITERATIONS; iteration++) {
    const start = performance.now()
    renderPlainText(expected.html)
    text.push(performance.now() - start)
  }
  return {
    coldMilliseconds: Number(coldMilliseconds.toFixed(3)),
    medianWarmMilliseconds: Number(median(warm).toFixed(3)),
    medianPlainTextMilliseconds: Number(median(text).toFixed(3)),
    htmlBytes: Buffer.byteLength(expected.html),
  }
}

const renderer = await buildEmails()
const report = {
  node: process.version,
  warmIterations: WARM_ITERATIONS,
  rows: LARGE_EMAIL_ROWS,
  large: await measure(() => renderer.renderEmail('large', largeProps)),
  welcome: await measure(() => renderer.renderEmail('welcome', welcomeProps)),
}
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
