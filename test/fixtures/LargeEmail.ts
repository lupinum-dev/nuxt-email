import { defineComponent, h } from 'vue'
import {
  EBody,
  EHead,
  EHtml,
  ELink,
  ESection,
  EText,
} from '../../src/runtime/components'

export const LARGE_EMAIL_ROWS = 48
export const LARGE_EMAIL_PAYLOAD = 'é€👩🏽‍💻é 你好 مرحبا '.repeat(12)

export const LargeEmail = defineComponent({
  name: 'LargeEmail',
  props: {
    payload: {
      type: String,
      required: true,
    },
    rows: {
      type: Number,
      required: true,
    },
  },
  setup(props) {
    return () => h(EHtml, { lang: 'en' }, {
      default: () => [
        h(EHead),
        h(EBody, null, {
          default: () => Array.from({ length: props.rows }, (_, index) => {
            return h(ESection, { 'data-row': index }, {
              default: () => h(EText, null, {
                default: () => [
                  `Row ${index + 1}: ${props.payload}`,
                  h(ELink, { href: `https://example.com/items/${index + 1}?source=email&mode=large` }, {
                    default: () => `Open item ${index + 1}`,
                  }),
                ],
              }),
            })
          }),
        }),
      ],
    })
  },
})
