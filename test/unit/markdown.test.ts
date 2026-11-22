import { marked } from 'marked'
import { expect, it } from 'vitest'
import { renderMarkdown } from '../../src/runtime/components/markdown/render-markdown'

it('ignores options set on the global marked instance', () => {
  const before = renderMarkdown('one\ntwo')
  // Each test file runs in its own module scope, so this global change stays here.
  marked.use({ breaks: true })
  expect(renderMarkdown('one\ntwo')).toBe(before)
  expect(before).not.toContain('<br')
})
