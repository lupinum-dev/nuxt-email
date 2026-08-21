import type { EmailComponentProps } from '@lupinum/nuxt-email'
import type BrokenEmail from './broken.vue'

export default {
  reason: 'intentional test failure',
} satisfies EmailComponentProps<typeof BrokenEmail>
