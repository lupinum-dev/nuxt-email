export type MarkdownStyle = Record<string, string | number | undefined>

function camelToKebabCase(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function escapeQuotes(value: string | number | undefined): string {
  if (typeof value === 'string' && value.includes('"')) {
    return value.replace(/"/g, '&quot;')
  }
  return String(value)
}

const NUMERICAL_CSS_PROPERTIES = new Set([
  'width',
  'height',
  'margin',
  'marginTop',
  'marginRight',
  'marginBottom',
  'marginLeft',
  'padding',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'outlineWidth',
  'top',
  'right',
  'bottom',
  'left',
  'fontSize',
  'letterSpacing',
  'wordSpacing',
  'maxWidth',
  'minWidth',
  'maxHeight',
  'minHeight',
  'borderRadius',
  'borderTopLeftRadius',
  'borderTopRightRadius',
  'borderBottomLeftRadius',
  'borderBottomRightRadius',
  'textIndent',
  'gridColumnGap',
  'gridRowGap',
  'gridGap',
  'translateX',
  'translateY',
])

// Direct port of react-email's parse-css-in-js-to-inline-css.ts: camelCase keys become
// kebab-case, whitelisted numeric properties get a px suffix, and double quotes are
// escaped to &quot;. Mirrors React's serialization byte-for-byte (including the fact that
// only this whitelist receives px), so it is intentionally separate from Vue's own style
// normalization used for the container element.
export function parseCssInJsToInlineCss(
  cssProperties: MarkdownStyle | undefined,
): string {
  if (!cssProperties) return ''

  return Object.entries(cssProperties)
    .map(([property, value]) => {
      if (typeof value === 'number' && NUMERICAL_CSS_PROPERTIES.has(property)) {
        return `${camelToKebabCase(property)}:${value}px`
      }

      return `${camelToKebabCase(property)}:${escapeQuotes(value)}`
    })
    .join(';')
}
