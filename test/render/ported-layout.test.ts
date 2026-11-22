import { describe, it } from 'vitest'
import type { PortedCase, PortedErrorCase } from './ported'
import { expectPortedCase, renderPortedCases, renderPortedErrors } from './ported'

const presentation = 'align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"'
const fixed = '; border, cellpadding, cellspacing, and role are fixed to preserve the email-client-safe table layout'
const components = ['EContainer', 'ESection', 'ERow'] as const

const paddingMoves: [string, string, string, string][] = [
  ['object', ':style="{ padding: \'16px\', backgroundColor: \'red\' }"', 'padding:16px;', 'background-color:red;'],
  ['string', ':style="\'padding:12px 20px;background-color:blue\'"', 'padding:12px 20px;', 'background-color:blue;'],
  ['kebab-case', ':style="{ \'padding-top\': \'4px\', \'padding-left\': \'8px\', width: \'90%\' }"', 'padding-top:4px;padding-left:8px;', 'width:90%;'],
]

const cases: PortedCase[] = [
  {
    name: 'container-padding',
    body: '<EContainer id="container-test" :style="{ backgroundColor: \'white\', maxWidth: \'600px\', padding: \'24px\' }">Container content</EContainer>',
    contains: ['<tr style="width:100%;"><td style="padding:24px;">Container content</td></tr>'],
  },
  {
    // Logical padding stays on the table; only physical padding moves to the cell.
    name: 'container-logical-padding',
    body: '<EContainer :style="{ backgroundColor: \'red\', padding: \'12px\', paddingInline: \'8px\' }">Content</EContainer>',
    contains: ['style="max-width:37.5em;background-color:red;padding-inline:8px;"', '<td style="padding:12px;">Content</td>'],
    golden: false,
  },
  {
    name: 'section-padding',
    body: '<ESection id="section-test" :style="{ backgroundColor: \'#f4f4f4\', padding: \'16px 20px\' }">Section content</ESection>',
    contains: ['<tbody><tr><td style="padding:16px 20px;">Section content</td></tr></tbody>'],
  },
  {
    name: 'section-row-columns',
    body: '<ESection><ERow id="row-test"><EColumn :style="{ color: \'red\' }" width="50%"><strong>Left</strong></EColumn><EColumn width="50%">Right</EColumn></ERow></ESection>',
    contains: ['<tbody style="width:100%;"><tr style="width:100%;"><td style="color:red;" width="50%"><strong>Left</strong></td><td width="50%">Right</td></tr></tbody>'],
    excludes: ['__react-email-column'],
  },
  {
    name: 'row-empty',
    body: '<ERow />',
    contains: ['<tbody style="width:100%;"><tr style="width:100%;"></tr></tbody>'],
  },
  {
    name: 'column-attributes',
    body: '<EColumn aria-label="Primary column" :colspan="2" :style="{ backgroundColor: \'red\' }" width="300">Column &amp; content</EColumn>',
    contains: ['aria-label="Primary column"', 'colspan="2"', 'style="background-color:red;"', 'width="300"', 'Column &amp; content'],
  },
  ...paddingMoves.map<PortedCase>(([form, style, cellStyle, tableStyle]) => ({
    // Physical padding of a row moves to a presentation cell around it; the rest stays on the table.
    name: `row-padding-${form}`,
    body: `<ERow ${style}><EColumn>Cell</EColumn></ERow>`,
    contains: [`style="${tableStyle}"`, `<td style="${cellStyle}"><table ${presentation}>`],
    excludes: [`<table ${presentation} style="${cellStyle}">`],
    golden: false,
  })),
]

const errors: PortedErrorCase[] = components.flatMap(component => [
  ...([['border', ':border="9"'], ['cellpadding', ':cellpadding="9"'], ['cellspacing', ':cellspacing="9"'], ['role', 'role="grid"']] as const)
    .map<PortedErrorCase>(([attribute, source]) => ({
      name: `${component}-${attribute}`,
      body: `<${component} ${source} />`,
      cause: `${component} does not allow overriding fixed presentation-table attribute: ${attribute}${fixed}`,
    })),
  {
    name: `${component}-all`,
    body: `<${component} :border="9" :cellpadding="9" :cellspacing="9" role="grid" />`,
    cause: `${component} does not allow overriding fixed presentation-table attributes: border, cellpadding, cellspacing, role${fixed}`,
  },
])

const rendered = renderPortedCases('layout', cases)
const renderError = renderPortedErrors('layout', errors)

describe('table layout on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('layout', entry, rendered)
  })

  it.each(errors.map(entry => [entry.name, entry] as const))('rejects %s', async (_name, entry) => {
    await renderError(entry)
  })
})
