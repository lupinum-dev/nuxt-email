import type { EmailComponentProps } from '@lupinum/nuxt-email'
import type WelcomeEmail from './welcome.vue'

export const FIXTURE_SENTINEL = 'NUXT_EMAIL_PLAYGROUND_FIXTURE_ONLY_6A34'

export default {
  dashboardUrl: 'https://example.com/workspaces/northstar',
  firstName: 'Ada',
  supportEmail: 'support@example.com',
  workspaceName: 'Northstar',
} satisfies EmailComponentProps<typeof WelcomeEmail>
