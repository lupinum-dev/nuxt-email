import { describe, it } from 'vitest'
import type { PortedCase, PortedErrorCase } from './ported'
import { expectPortedCase, renderPortedCases, renderPortedErrors } from './ported'

const body = '<EText>Sample body copy in the branded font.</EText>'

const cases: PortedCase[] = [
  {
    // The empty `src` line stays as bare indentation; the global rule uses the first fallback.
    name: 'defaults',
    head: '<EFont font-family="Roboto" fallback-font-family="Verdana" />',
    body,
    contains: [
      '@font-face {\n      font-family: \'Roboto\';\n      font-style: normal;\n      font-weight: 400;\n      mso-font-alt: \'Verdana\';\n      \n    }',
      'font-family: \'Roboto\', Verdana;',
    ],
  },
  {
    name: 'web-font',
    head: '<EFont font-family="Roboto" fallback-font-family="Verdana" :web-font="{ url: \'https://example.com/roboto.woff2\', format: \'woff2\' }" :font-weight="700" font-style="italic" />',
    body,
    contains: ['@font-face {\n      font-family: \'Roboto\';\n      font-style: italic;\n      font-weight: 700;\n      mso-font-alt: \'Verdana\';\n      src: url(https://example.com/roboto.woff2) format(\'woff2\');\n    }'],
  },
  {
    // Only the first fallback goes to `mso-font-alt`; all of them go to the global rule.
    name: 'multiple-fallbacks',
    head: '<EFont font-family="Roboto" :fallback-font-family="[\'Georgia\', \'serif\']" />',
    body,
    contains: ['mso-font-alt: \'Georgia\';', 'font-family: \'Roboto\', Georgia, serif;'],
  },
  {
    // Dynamic values must not close the <style> element.
    name: 'style-breakout',
    head: '<EFont :font-family="\'Safe\\\'</style><img src=x><style>\'" fallback-font-family="Verdana" :web-font="{ format: \'woff2\', url: \'https://example.com/font.woff2?name=</style><img src=x>\' }" />',
    body,
    contains: [
      'font-family: \'Safe\\\'\\3C /style\\3E \\3C img src=x\\3E \\3C style\\3E \';',
      'url(\'https://example.com/font.woff2?name=\\3C /style\\3E \\3C img src=x\\3E \')',
    ],
    excludes: ['</style><img', '<img src=x>'],
    golden: false,
  },
  {
    name: 'safe-url-query',
    head: '<EFont font-family="Roboto" fallback-font-family="Verdana" :web-font="{ format: \'woff2\', url: \'https://example.com/roboto.woff2?v=1&source=email\' }" />',
    body,
    contains: ['src: url(https://example.com/roboto.woff2?v=1&source=email) format(\'woff2\');'],
    golden: false,
  },
]

const invalid = (name: string, props: string, cause: string): PortedErrorCase => ({ name, head: `<EFont ${props} />`, body, cause })
const errors: PortedErrorCase[] = [
  invalid('empty-family', 'font-family="" fallback-font-family="Verdana"', 'EFont fontFamily must be a non-empty string'),
  invalid('no-fallback', 'font-family="Roboto" :fallback-font-family="[]"', 'EFont fallbackFontFamily must contain at least one fallback'),
  invalid('missing-fallback', 'font-family="Roboto"', 'EFont fallbackFontFamily contains unsupported fallback undefined'),
  invalid('bad-style', 'font-family="Roboto" fallback-font-family="Verdana" font-style="</style>"', 'EFont fontStyle must be normal, italic, or oblique; received "</style>"'),
  invalid('bad-weight', 'font-family="Roboto" fallback-font-family="Verdana" font-weight="400;}</style>"', 'EFont fontWeight must be between 1 and 1000 or a supported keyword; received "400;}</style>"'),
  invalid('empty-url', 'font-family="Roboto" fallback-font-family="Verdana" :web-font="{ format: \'woff2\', url: \'\' }"', 'EFont webFont.url must be a non-empty string'),
]

const rendered = renderPortedCases('font', cases)
const renderError = renderPortedErrors('font', errors)

describe('EFont on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('font', entry, rendered)
  })

  it.each(errors.map(entry => [entry.name, entry] as const))('rejects %s', async (_name, entry) => {
    await renderError(entry)
  })
})
