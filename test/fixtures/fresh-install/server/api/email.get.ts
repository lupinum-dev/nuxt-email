export function proveGeneratedEmailTypes(): void {
  void renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada',
  })

  // @ts-expect-error orderNumber is required by welcome.vue
  void renderEmail('welcome', { recipientName: 'Ada' })

  void renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada',
    // @ts-expect-error extra props are rejected
    unexpected: true,
  })

  // @ts-expect-error only discovered template names are accepted
  void renderEmail('missing-template', {})
}

export default defineEventHandler(() => {
  return renderEmail('welcome', {
    orderNumber: 7319,
    recipientName: 'Ada & Lin',
  })
})
