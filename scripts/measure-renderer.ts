import { arch, platform, release } from 'node:os'
import { performance } from 'node:perf_hooks'
import { renderEmailComponent } from '../src/runtime/render/render-email-component'
import {
  LARGE_EMAIL_PAYLOAD,
  LARGE_EMAIL_ROWS,
  LargeEmail,
} from '../test/fixtures/LargeEmail'
import { measureRenderer } from '../test/helpers/render-performance'

const WARM_ITERATIONS = 100
const SEQUENTIAL_ITERATIONS = 1_000
const props = {
  payload: LARGE_EMAIL_PAYLOAD,
  rows: LARGE_EMAIL_ROWS,
}

if (typeof globalThis.gc !== 'function') {
  throw new TypeError('Renderer measurement requires Node --expose-gc')
}

const measurement = await measureRenderer(LargeEmail, props, WARM_ITERATIONS)
const expected = await renderEmailComponent(LargeEmail, props)

globalThis.gc()
const startingHeapBytes = process.memoryUsage().heapUsed
const sequentialStart = performance.now()

for (let iteration = 0; iteration < SEQUENTIAL_ITERATIONS; iteration++) {
  const result = await renderEmailComponent(LargeEmail, props)
  if (result.html !== expected.html || result.text !== expected.text) {
    throw new Error(`Renderer output changed at sequential iteration ${iteration + 1}`)
  }
}

const sequentialMilliseconds = performance.now() - sequentialStart
globalThis.gc()
const endingHeapBytes = process.memoryUsage().heapUsed

const report = {
  runtime: {
    architecture: arch(),
    node: process.version,
    operatingSystem: `${platform()} ${release()}`,
  },
  fixture: {
    name: 'LargeEmail',
    rows: LARGE_EMAIL_ROWS,
  },
  measurements: {
    coldMilliseconds: Number(measurement.coldMilliseconds.toFixed(3)),
    heapChangeBytesAcrossSequentialRenders: endingHeapBytes - startingHeapBytes,
    htmlBytes: measurement.htmlBytes,
    medianWarmMilliseconds: Number(measurement.medianWarmMilliseconds.toFixed(3)),
    sequentialIterations: SEQUENTIAL_ITERATIONS,
    sequentialMilliseconds: Number(sequentialMilliseconds.toFixed(3)),
    textBytes: measurement.textBytes,
    warmIterations: WARM_ITERATIONS,
  },
}

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
