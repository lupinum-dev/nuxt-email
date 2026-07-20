import { defineEventHandler } from 'h3'
import { createSSRApp } from 'vue'
import { renderToString } from 'vue/server-renderer'
import EmailProof from '../../app/emails/EmailProof.vue'

export default defineEventHandler(() => {
  return renderToString(createSSRApp(EmailProof, { name: 'Ada' }))
})
