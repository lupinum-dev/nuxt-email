import type { Component } from 'vue'
import { performance } from 'node:perf_hooks'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'

export interface RenderMeasurement {
  coldMilliseconds: number
  htmlBytes: number
  medianWarmMilliseconds: number
  textBytes: number
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right)
  const middle = Math.floor(sorted.length / 2)

  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!
}

export async function measureRenderer(
  component: Component,
  props: Record<string, unknown>,
  warmIterations: number,
): Promise<RenderMeasurement> {
  if (!Number.isInteger(warmIterations) || warmIterations < 1) {
    throw new TypeError(`warmIterations must be a positive integer; received ${String(warmIterations)}`)
  }

  const coldStart = performance.now()
  const expected = await renderEmailComponent(component, props)
  const coldMilliseconds = performance.now() - coldStart
  const warmDurations: number[] = []

  for (let iteration = 0; iteration < warmIterations; iteration++) {
    const start = performance.now()
    const result = await renderEmailComponent(component, props)
    warmDurations.push(performance.now() - start)

    if (result.html !== expected.html || result.text !== expected.text) {
      throw new Error(`Renderer output changed at warm iteration ${iteration + 1}`)
    }
  }

  return {
    coldMilliseconds,
    htmlBytes: Buffer.byteLength(expected.html, 'utf8'),
    medianWarmMilliseconds: median(warmDurations),
    textBytes: Buffer.byteLength(expected.text, 'utf8'),
  }
}
