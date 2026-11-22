import { describe, it } from 'vitest'
import type { PortedCase, PortedErrorCase } from './ported'
import { expectPortedCase, renderPortedCases, renderPortedErrors } from './ported'

const lines = (...rows: string[]) => rows.join('\n')

const document = lines(
  '# Heading One',
  '',
  'A paragraph with **bold** and *italic* text and a [link](https://example.com).',
  '',
  '- First item',
  '- Second item',
  '- Third item',
  '',
  '> A quoted line of context.',
  '',
  '```js',
  'const total = 1 + 2;',
  '```',
  '',
  '---',
  '',
  '![Logo alt](https://example.com/logo.png)',
)
const styled = lines('# Styled heading', '', 'Body text with **strong** emphasis.')

// `<` is escaped so that Markdown with `</script>` cannot end the SFC script block.
const literal = (source: string) => JSON.stringify(source).replaceAll('<', '\\u003C')

/** A case whose Markdown comes from a `source` constant in `<script setup>`. */
function markdown(name: string, source: string, attributes = '', extra: Partial<PortedCase> = {}): PortedCase {
  return { name, script: `const source = ${literal(source)}`, body: `<EMarkdown :source="source"${attributes === '' ? '' : ` ${attributes}`} />`, ...extra }
}

const cases: PortedCase[] = [
  markdown('document', document, '', {
    contains: ['target="_blank"'],
    // React Email's `data-id` marker on the container is gone.
    excludes: ['data-id'],
  }),
  markdown('custom-styles', styled, ':markdown-custom-styles="{ h1: { color: \'red\' }, bold: { padding: \'1px 2px\' } }" :style="{ padding: \'8px\' }"', {
    contains: ['<h1 style="color:red">Styled heading</h1>', '<strong style="padding:1px 2px">strong</strong>'],
  }),
  markdown('container-and-attributes', styled, 'class="wrap" id="note" dir="rtl" :style="{ padding: \'8px\', paddingTop: \'10px\', marginBottom: \'20px\', lineHeight: 2, opacity: 0, zIndex: 5, height: 0 }"', {
    contains: [
      'class="wrap"',
      'id="note"',
      'dir="rtl"',
      // Lengths get `px`; unitless properties and zero stay numeric.
      'padding:8px',
      'padding-top:10px',
      'margin-bottom:20px',
      'line-height:2;',
      'opacity:0;',
      'z-index:5;',
      'height:0;',
    ],
    excludes: ['height:0px'],
  }),
  markdown('style-forms', styled, ':style="[{ padding: 8, lineHeight: 2 }, \'margin-top:4px\']"', {
    contains: ['style="padding:8;line-height:2;margin-top:4px;"'],
    excludes: ['padding:8px'],
    golden: false,
  }),
  markdown('table-styles', '| Header |\n| --- |\n| Cell |', ':markdown-custom-styles="{ th: { color: \'red\' }, td: { color: \'blue\' } }"', {
    contains: ['<th style="color:red">Header</th>', '<td style="color:blue">Cell</td>'],
    golden: false,
  }),
  markdown('links-escaping', lines(
    '[quoted "link" text](https://example.com/?q="a"&b=c "A \\"quoted\\" title")',
    '',
    '![alt "with" quotes](https://example.com/i.png "image \\"title\\"")',
  ), '', {
    contains: [
      '<a href="https://example.com/?q=&quot;a&quot;&b=c" target="_blank" title="A &quot;quoted&quot; title" style="color:#007bff;text-decoration:underline;background-color:transparent">quoted &quot;link&quot; text</a>',
      '<img src="https://example.com/i.png" alt="alt &quot;with&quot; quotes" title="image &quot;title&quot;">',
    ],
  }),
  markdown('nested-lists', lines('- Item one', '  - Nested one', '  - Nested two', '- Item two', '', '1. Ordered one', '', '2. Ordered two (loose)')),
  markdown('code-is-escaped', lines('`<img src=x onerror=alert(1)>`', '', '```html', '<script>alert(1)</script>', '```'), '', {
    contains: ['&lt;img src=x onerror=alert(1)&gt;', '&lt;script&gt;alert(1)&lt;/script&gt;'],
    excludes: ['<script>', '<img src=x'],
    golden: false,
  }),
  markdown('safe-destinations', '[Web](https://example.com) [Email](mailto:hello@example.com) [Phone](tel:+431234) [Relative](/account) ![Inline attachment](cid:logo)', '', {
    contains: ['href="https://example.com"', 'href="mailto:hello@example.com"', 'href="tel:+431234"', 'href="/account"', 'src="cid:logo"'],
    golden: false,
  }),
]

const rawHtml = ['<script>alert(1)</script>', '<img src=x onerror="alert(1)">', '<!-- hidden raw HTML -->']
const unsafeUrls: [string, string, string][] = [
  ['[x](javascript:alert(1))', 'link', 'javascript'],
  ['[x](javascript&#58;alert(1))', 'link', 'javascript'],
  ['[x](&#106;avascript:alert(1))', 'link', 'javascript'],
  ['[x](java&#10;script:alert(1))', 'link', 'javascript'],
  ['[x](vbscript:msgbox(1))', 'link', 'vbscript'],
  ['![x](data:text/html;base64,PHNjcmlwdD4=)', 'image', 'data'],
]

const errors: PortedErrorCase[] = [
  ...[
    ['text-slot', '<EMarkdown># Hello</EMarkdown>'],
    ['element-slot', '<EMarkdown><strong>nested</strong></EMarkdown>'],
    ['no-source', '<EMarkdown />'],
    ['undefined-source', '<EMarkdown :source="undefined" />'],
  ].map<PortedErrorCase>(([name, body]) => ({
    name: name!,
    body: body!,
    cause: 'EMarkdown takes its Markdown from the source prop, for example <EMarkdown :source="body" />',
  })),
  ...rawHtml.map<PortedErrorCase>((source, index) => ({
    ...markdown(`raw-html-${index}`, source),
    cause: 'EMarkdown does not support raw HTML',
  })),
  ...unsafeUrls.map<PortedErrorCase>(([source, kind, scheme], index) => ({
    ...markdown(`unsafe-url-${index}`, source),
    cause: `EMarkdown ${kind} URL uses an unsupported scheme: ${scheme}`,
  })),
]

const rendered = renderPortedCases('markdown', cases)
const renderError = renderPortedErrors('markdown', errors)

describe('EMarkdown on the build-time path', () => {
  it.each(cases.map(entry => [entry.name, entry] as const))('%s', async (_name, entry) => {
    await expectPortedCase('markdown', entry, rendered)
  })

  it.each(errors.map(entry => [entry.name, entry] as const))('rejects %s', async (_name, entry) => {
    await renderError(entry)
  })
})
