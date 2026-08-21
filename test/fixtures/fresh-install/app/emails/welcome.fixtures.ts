import type { EmailComponentProps } from '@lupinum/nuxt-email'
import type WelcomeEmail from './welcome.vue'

export const FIXTURE_SENTINEL = 'NUXT_EMAIL_FRESH_FIXTURE_ONLY_8B27'

export default {
  orderNumber: 2048,
  recipientName: 'Fixture Ada',
} satisfies EmailComponentProps<typeof WelcomeEmail>
