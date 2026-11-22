import { defineComponent } from 'vue'
import type { EmailComponentProps } from '../../src/module'
import type { EEmailProps } from '../../src/runtime/components/EEmail'

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

const emailProps: EEmailProps = { subject: 'Welcome', lang: 'en', preview: 'Hello', dir: 'rtl', text: 'Plain' }
// @ts-expect-error EEmail requires an explicit language
const emailWithoutLang: EEmailProps = { subject: 'Welcome' }
// @ts-expect-error EEmail requires a subject
const emailWithoutSubject: EEmailProps = { lang: 'en' }
// @ts-expect-error dir is ltr, rtl or auto
const emailWithBadDir: EEmailProps = { subject: 'Welcome', lang: 'en', dir: 'up' }

void fixture
void invalidFixtureKey
void invalidListenerFixture
void EmittingEmail
void FixtureEmail
void emailProps
void emailWithoutLang
void emailWithoutSubject
void emailWithBadDir
void missingFixtureProp
