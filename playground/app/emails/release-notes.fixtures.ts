import type { EmailComponentProps } from '@lupinum/nuxt-email'
import type ReleaseNotesEmail from './release-notes.vue'

export default {
  changelogUrl: 'https://example.com/changelog/v2-4',
  highlights: [
    '## Highlights',
    '',
    '- **Tailwind boundaries** now inline utilities from nested components.',
    '- `defineEmail` computes the subject from the same typed props.',
    '- Plain-text output is generated from the exact rendered HTML.',
    '',
    'See the notes below for the upgrade steps.',
  ].join('\n'),
  productName: 'Northstar',
  recipientName: 'Ada',
  version: 'v2.4',
} satisfies EmailComponentProps<typeof ReleaseNotesEmail>
