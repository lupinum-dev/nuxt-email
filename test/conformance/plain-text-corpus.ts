export const plainTextCorpus = {
  'plain-text-nested-lists': '<ul><li>One<ul><li>Nested A</li><li>Nested B</li></ul></li><li>Two</li></ul>',
  'plain-text-ordered-start': '<ol start="5"><li>One</li><li>Two</li></ol>',
  'plain-text-blockquote': '<blockquote>one<br>two</blockquote>',
  'plain-text-breaks': 'a<br>b<br><br>c',
  'plain-text-tables': [
    '<table><tr><td>A</td><td>B</td></tr><tr><td>C</td><td>D</td></tr></table>',
    '<table><tr><td><table><tr><td>Col A</td></tr></table></td><td><table><tr><td>Col B</td></tr></table></td></tr></table>',
    '<table data-text-format="dataTable"><tr><td>Ada</td><td>Engineer</td></tr><tr><td>Grace</td><td>Admiral</td></tr></table>',
  ].join('<p></p>'),
  'plain-text-preformatted': '<pre>line  one\n  indented</pre>',
  'plain-text-links': '<a href="#section">jump</a><p><a href="mailto:x@y.com">mail me</a></p><a>bare</a>',
  'plain-text-unicode': '<p>Grüße 🌍 你好 مرحبا 👩🏽‍💻 é é €</p>',
} as const

export type PlainTextCorpusCaseId = keyof typeof plainTextCorpus
