import type WelcomeEmail from './welcome.vue'

type WelcomeEmailProps = Omit<
  InstanceType<typeof WelcomeEmail>['$props'],
  keyof import('vue').PublicProps
>

export const FIXTURE_SENTINEL = 'NUXT_EMAIL_FRESH_FIXTURE_ONLY_8B27'

export default {
  orderNumber: 2048,
  recipientName: 'Fixture Ada',
} satisfies WelcomeEmailProps
