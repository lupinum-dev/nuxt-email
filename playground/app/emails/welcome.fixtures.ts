import type WelcomeEmail from './welcome.vue'

type WelcomeEmailProps = Omit<
  InstanceType<typeof WelcomeEmail>['$props'],
  keyof import('vue').PublicProps
>

export const FIXTURE_SENTINEL = 'NUXT_EMAIL_PLAYGROUND_FIXTURE_ONLY_6A34'

export default {
  dashboardUrl: 'https://example.com/workspaces/northstar',
  firstName: 'Ada',
  supportEmail: 'support@example.com',
  workspaceName: 'Northstar',
} satisfies WelcomeEmailProps
