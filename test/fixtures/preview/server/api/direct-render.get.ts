import { defineEventHandler } from 'h3'

export default defineEventHandler(() => {
  return renderEmail('welcome', {
    firstName: 'Ada',
  })
})
