import {
  type CssNode,
  type FunctionNode,
  generate,
  List,
  parse,
  type Raw,
  type Value,
  walk,
} from '../../css-tree'

function rgbNode(
  r: number,
  g: number,
  b: number,
  alpha?: number,
): FunctionNode {
  const children = new List<CssNode>()
  children.appendData({
    type: 'Number',
    value: r.toFixed(0),
  })
  children.appendData({
    type: 'Operator',
    value: ',',
  })
  children.appendData({
    type: 'Number',
    value: g.toFixed(0),
  })
  children.appendData({
    type: 'Operator',
    value: ',',
  })
  children.appendData({
    type: 'Number',
    value: b.toFixed(0),
  })
  if (alpha !== 1 && alpha !== undefined) {
    children.appendData({
      type: 'Operator',
      value: ',',
    })
    children.appendData({
      type: 'Number',
      value: alpha.toString(),
    })
  }

  return {
    type: 'Function',
    name: 'rgb',
    children,
  }
}

const LAB_TO_LMS = {
  l: [0.3963377773761749, 0.2158037573099136],
  m: [-0.1055613458156586, -0.0638541728258133],
  s: [-0.0894841775298119, -1.2914855480194092],
}
const LSM_TO_RGB = {
  r: [4.0767416360759583, -3.3077115392580629, 0.2309699031821043],
  g: [-1.2684379732850315, 2.6097573492876882, -0.341319376002657],
  b: [-0.0041960761386756, -0.7034186179359362, 1.7076146940746117],
}

function lrgbToRgb(input: number): number {
  const absoluteNumber = Math.abs(input)
  const sign = input < 0 ? -1 : 1

  if (absoluteNumber > 0.0031308) {
    return sign * (absoluteNumber ** (1 / 2.4) * 1.055 - 0.055)
  }

  return input * 12.92
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function oklchToOklab(oklch: { l: number, c: number, h: number }) {
  return {
    l: oklch.l,
    a: oklch.c * Math.cos((oklch.h / 180) * Math.PI),
    b: oklch.c * Math.sin((oklch.h / 180) * Math.PI),
  }
}

/** Convert oklab to RGB */
function oklchToRgb(oklch: { l: number, c: number, h: number }) {
  const oklab = oklchToOklab(oklch)

  const l
    = (oklab.l + LAB_TO_LMS.l[0]! * oklab.a + LAB_TO_LMS.l[1]! * oklab.b) ** 3
  const m
    = (oklab.l + LAB_TO_LMS.m[0]! * oklab.a + LAB_TO_LMS.m[1]! * oklab.b) ** 3
  const s
    = (oklab.l + LAB_TO_LMS.s[0]! * oklab.a + LAB_TO_LMS.s[1]! * oklab.b) ** 3

  const r
    = 255
      * lrgbToRgb(
        LSM_TO_RGB.r[0]! * l + LSM_TO_RGB.r[1]! * m + LSM_TO_RGB.r[2]! * s,
      )
  const g
    = 255
      * lrgbToRgb(
        LSM_TO_RGB.g[0]! * l + LSM_TO_RGB.g[1]! * m + LSM_TO_RGB.g[2]! * s,
      )
  const b
    = 255
      * lrgbToRgb(
        LSM_TO_RGB.b[0]! * l + LSM_TO_RGB.b[1]! * m + LSM_TO_RGB.b[2]! * s,
      )

  return {
    r: clamp(r, 0, 255),
    g: clamp(g, 0, 255),
    b: clamp(b, 0, 255),
  }
}

/**
 * Rewrite declarations that Lightning CSS would change more than email needs:
 * - convert `oklch` values into `rgb` by clipping each channel; Lightning
 *   CSS maps out-of-gamut colours differently (`blue-500` would change);
 * - convert `border-radius: calc(infinity * 1px)` into `9999px`.
 */
export function sanitizeDeclarations(nodeContainingDeclarations: CssNode): void {
  walk(nodeContainingDeclarations, {
    visit: 'Declaration',
    enter(declaration) {
      if (declaration.value.type === 'Raw') {
        declaration.value = parse(declaration.value.value, {
          context: 'value',
        }) as Value | Raw
      }
      if (
        /border-(?:[a-z]+-){0,2}radius\s*:\s*calc\s*\(\s*infinity\s*\*\s*1px\s*\)/i.test(
          generate(declaration),
        )
      ) {
        declaration.value = parse('9999px', { context: 'value' }) as Value
      }
      walk(declaration, {
        visit: 'Function',
        enter(func, funcParentListItem) {
          const children = func.children.toArray()
          if (func.name === 'oklch') {
            let l: number | undefined
            let c: number | undefined
            let h: number | undefined
            let a: number | undefined
            for (const child of children) {
              if (child.type === 'Number') {
                if (l === undefined) {
                  l = Number.parseFloat(child.value)
                  continue
                }
                if (c === undefined) {
                  c = Number.parseFloat(child.value)
                  continue
                }
                if (h === undefined) {
                  h = Number.parseFloat(child.value)
                  continue
                }
                if (a === undefined) {
                  a = Number.parseFloat(child.value)
                  continue
                }
              }
              if (child.type === 'Dimension' && child.unit === 'deg') {
                if (h === undefined) {
                  h = Number.parseFloat(child.value)
                  continue
                }
              }
              if (child.type === 'Percentage') {
                if (l === undefined) {
                  l = Number.parseFloat(child.value) / 100
                  continue
                }
                if (a === undefined) {
                  a = Number.parseFloat(child.value) / 100
                }
              }
            }

            if (l === undefined || c === undefined || h === undefined) {
              throw new Error(
                'Could not determine the parameters of an oklch() function.',
                {
                  cause: declaration,
                },
              )
            }

            const rgb = oklchToRgb({
              l,
              c,
              h,
            })

            funcParentListItem.data = rgbNode(rgb.r, rgb.g, rgb.b, a)
          }
        },
      })
    },
  })
}
