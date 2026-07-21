import { defineComponent, h } from 'vue'
import { EBody, EContainer, EHead, EHeading, EHtml, EText } from '../../src/runtime/components'
import { defineEmail } from '../../src/runtime/render/define-email'

export interface DefineEmailWelcomeProps {
  firstName: string
}

/**
 * Mirrors a real email SFC whose `<script setup>` declares a subject via
 * `defineEmail`, rendered through the same pipeline `renderEmail` uses. The
 * `setup` body stands in for the compiled top-level `<script setup>` code.
 */
export const DefineEmailWelcome = defineComponent({
  name: 'DefineEmailWelcome',
  props: {
    firstName: {
      type: String,
      required: true,
    },
  },
  setup(props: DefineEmailWelcomeProps) {
    defineEmail({
      subject: () => `Welcome aboard, ${props.firstName}`,
    })

    return () => h(EHtml, { lang: 'en' }, {
      default: () => [
        h(EHead),
        h(EBody, null, {
          default: () => h(EContainer, null, {
            default: () => [
              h(EHeading, null, { default: () => `Welcome, ${props.firstName}` }),
              h(EText, null, { default: () => 'Thanks for signing up.' }),
            ],
          }),
        }),
      ],
    })
  },
})
