# Phase 3 renderer measurement

This is the informational baseline for the stable `LargeEmail` fixture. It is not a release threshold. Re-run `pnpm performance:measure` on a stable CI runner before introducing a regression budget.

## Environment

| Field | Value |
| --- | --- |
| Node | v24.18.0 |
| Operating system | darwin 25.5.0 |
| Architecture | arm64 |
| Fixture | `LargeEmail`, 48 rows |
| Warm iterations | 100 |
| Sequential iterations | 1,000 |

## Result

| Measurement | Value |
| --- | ---: |
| Cold render | 19.238 ms |
| Median warm render | 2.654 ms |
| 1,000 sequential renders | 2,518.577 ms |
| Heap change after forced collection | -499,512 bytes |
| HTML size | 43,447 bytes |
| Plain-text size | 27,763 bytes |

All 1,100 measured warm and sequential renders were byte-identical to the first output. The forced-GC heap result showed no sustained growth in this run. Timing and heap values remain environment-dependent; output differences or render failures are the only enforced conditions.

No render cache, global mutable renderer, or derived read model was added.
