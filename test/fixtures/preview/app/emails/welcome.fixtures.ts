import type WelcomeEmail from './welcome.vue'

type WelcomeEmailProps = Omit<
  InstanceType<typeof WelcomeEmail>['$props'],
  keyof import('vue').PublicProps
>

export const FIXTURE_SENTINEL = 'NUXT_EMAIL_FIXTURE_ONLY_93D1'

export default {
  firstName: 'Ada',
} satisfies WelcomeEmailProps
