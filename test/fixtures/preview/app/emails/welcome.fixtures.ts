import type { EmailComponentProps } from '@lupinum/nuxt-email'
import type WelcomeEmail from './welcome.vue'

export const FIXTURE_SENTINEL = 'NUXT_EMAIL_FIXTURE_ONLY_93D1'

export default {
  firstName: 'Ada',
} satisfies EmailComponentProps<typeof WelcomeEmail>
