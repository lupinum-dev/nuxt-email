import { convert } from 'html-to-text'

export function renderPlainText(html: string): string {
  return convert(html, {
    wordwrap: false,
    selectors: [
      { selector: 'img', format: 'skip' },
      { selector: '[data-skip-in-text=true]', format: 'skip' },
      {
        selector: 'a',
        options: { linkBrackets: false, hideLinkHrefIfSameAsText: true },
      },
      { selector: '[data-text-format="dataTable"]', format: 'dataTable' },
    ],
  })
}
