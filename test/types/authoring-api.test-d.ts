import { defineComponent } from 'vue'
import type { EmailComponentProps } from '../../src/module'
import type { EHtmlProps } from '../../src/runtime/components/EHtml'
import { defineEmail } from '../../src/runtime/render/define-email'

const FixtureEmail = defineComponent({
  props: {
    count: { type: Number, required: false },
    firstName: { type: String, required: true },
  },
})

const EmittingEmail = defineComponent({
  emits: ['save'],
  props: {
    firstName: { type: String, required: true },
  },
})

const fixture = {
  count: 1,
  firstName: 'Ada',
} satisfies EmailComponentProps<typeof FixtureEmail>

const invalidListenerFixture = {
  firstName: 'Ada',
  // @ts-expect-error Vue-generated event listeners are not email template props
  onSave: () => {},
} satisfies EmailComponentProps<typeof EmittingEmail>

// @ts-expect-error required fixture props cannot be omitted
const missingFixtureProp: EmailComponentProps<typeof FixtureEmail> = { count: 1 }

const invalidFixtureKey = {
  firstName: 'Ada',
  // @ts-expect-error fixture objects reject undeclared props
  unknown: true,
} satisfies EmailComponentProps<typeof FixtureEmail>

const htmlProps: EHtmlProps = { lang: 'en' }
// @ts-expect-error EHtml requires an explicit language
const htmlWithoutLang: EHtmlProps = {}

defineEmail({ subject: 'Constant subject' })
defineEmail({ text: 'Constant text' })
defineEmail({
  subject: () => `Welcome, ${fixture.firstName}`,
  text: () => `Plain welcome for ${fixture.firstName}`,
})

// @ts-expect-error defineEmail requires at least one metadata value
defineEmail({})
// @ts-expect-error metadata values must be strings or synchronous string functions
defineEmail({ subject: 42 })
// @ts-expect-error subject functions are synchronous
defineEmail({ subject: async () => 'Async subject' })
// @ts-expect-error text functions are synchronous
defineEmail({ text: async () => 'Async text' })

void invalidFixtureKey
void invalidListenerFixture
void EmittingEmail
void FixtureEmail
void htmlProps
void htmlWithoutLang
void missingFixtureProp
