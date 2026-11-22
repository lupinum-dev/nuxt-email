import { writeFile } from 'node:fs/promises'
import { createTestRenderer } from '@lupinum/nuxt-email/testing'
import { expect, it } from 'vitest'
import type { EmailTemplateProps } from '#nuxt-email/registry'

it('renders the app templates with the same compiler as the Nuxt build', async () => {
  const { renderEmail } = await createTestRenderer<EmailTemplateProps>({
    rootDir: '.',
    codeBlock: { languages: ['typescript'], theme: 'github-dark' },
  })
  const email = await renderEmail('welcome', { orderNumber: 7319, recipientName: 'Ada & Lin' })

  expect(email.subject).toBe('Order 7319 confirmed')
  expect(email.html).toContain('data-code-theme="github-dark"')
  expect(email.text).toContain('const status: string = "<ready>"')
  // The packed-consumer check compares this file with the production route's render.
  await writeFile('test-render.json', JSON.stringify(email))
})
