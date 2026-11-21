import { describe, it } from 'vitest'
import type { PortedCase } from './ported'
import { expectPortedCase, renderPortedCases } from './ported'

// The Orange.fr fix-up rule, byte for byte: it shows the compatibility copy and hides the visible one.
const orangeRule = '<style>\n        meta ~ .cino {\n          display: none !important;\n          opacity: 0 !important;\n        }\n\n        meta ~ .cio {\n          display: block !important;\n        }\n      </style>'

const cases: PortedCase[] = [
  {
    // Three siblings: the rule, the visible <code> and the hidden copy. The author class comes before cino/cio.
    name: 'classed',
    body: '<EText><ECodeInline class="inline-code">const x = 1;</ECodeInline></EText>',
    contains: [
      orangeRule,
      '<code class="inline-code cino">const x = 1;</code>',
      '<span class="inline-code cio" style="display:none;" data-skip-in-text="true">const x = 1;</span>',
    ],
    // The compatibility copy must not reach the plain text.
    text: 'const x = 1;',
  },
  {
    // React emitted ` cino` with a leading space; Vue trims it.
    name: 'unclassed',
    body: '<EText><ECodeInline>const x = 1;</ECodeInline></EText>',
    contains: [
      '<code class="cino">const x = 1;</code>',
      '<span class="cio" style="display:none;" data-skip-in-text="true">const x = 1;</span>',
    ],
    text: 'const x = 1;',
  },
  {
    // The slot is rendered once per copy, so element content must appear in both.
    name: 'element-child',
    body: '<EText><ECodeInline><span>const x = 1;</span></ECodeInline></EText>',
    contains: [
      '<code class="cino"><span>const x = 1;</span></code>',
      '<span class="cio" style="display:none;" data-skip-in-text="true"><span>const x = 1;</span></span>',
    ],
    text: 'const x = 1;',
    golden: false,
  },
]

const rendered = renderPortedCases('code-inline', cases)

describe('ECodeInline on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('code-inline', entry, rendered)
  })
})
