import type BrokenEmail from './broken.vue'

type BrokenEmailProps = Omit<
  InstanceType<typeof BrokenEmail>['$props'],
  keyof import('vue').PublicProps
>

export default {
  reason: 'intentional test failure',
} satisfies BrokenEmailProps
