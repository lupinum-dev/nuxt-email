# Renderer measurement

This is the informational baseline for the build-time Tailwind renderer. [`test/performance/measure.ts`](../../test/performance/measure.ts) produced it. It is not a release threshold. Re-run `pnpm performance:measure` on a stable CI runner before introducing a regression budget.

## Method

- The script compiles `test/fixtures/render/welcome/` with `createTestRenderer`, the same compiler and renderer as the Nuxt module. The time to compile is not measured.
- **Cold render** is the first render after compilation.
- **Median warm render** is the median of the next 100 renders with the same props. Every warm render must return the same HTML and text as the cold render, or the script fails.
- **Median plain text** is the median of 100 runs of the plain-text conversion on the rendered HTML.
- Two templates are measured: `large` with 48 rows of multi-byte text, and `welcome`.

## Environment

| Field | Value |
| --- | --- |
| Date | 2026-11-22 |
| Node | v24.22.1 |
| Operating system | Darwin 27.0.0 |
| Machine | Apple M1 Pro, 10 cores, arm64 |
| Load average before the run | about 4 (other work was running) |
| Runs | one |

## Result

| Measurement | `large` (48 rows) | `welcome` |
| --- | ---: | ---: |
| Cold render | 18.316 ms | 2.832 ms |
| Median warm render | 3.215 ms | 0.520 ms |
| Median plain text | 0.837 ms | 0.253 ms |
| HTML size | 48,847 bytes | 6,016 bytes |

The HTML is smaller than in the 2026-11-12 run (50,167 and 6,139 bytes). The generated CSS changed between the runs: colors are hex or `rgba()` and sizes are `px`.

All warm renders were byte-identical to the first output. Timing values depend on the machine and its load; output differences or render failures are the only enforced conditions.

No render cache, global mutable renderer, or derived read model was added.
