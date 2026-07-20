export function proveEmailTypes(): void {
  void renderEmail('transactional', {
    activationUrl: 'https://example.com/activate',
    firstName: 'Ada',
    logoUrl: 'https://example.com/logo.png',
  })

  void renderEmail('account/reset-password', {
    code: 'VUE-2048',
    expiresInMinutes: 15,
  })

  void renderEmail('account/reset-password', {
    code: 'VUE-2048',
    expiresInMinutes: 15,
    optionalNote: 'Optional props remain optional.',
  })

  // @ts-expect-error unknown template names are rejected
  void renderEmail('TransactionalEmail', {})

  // @ts-expect-error firstName is required
  void renderEmail('transactional', {
    activationUrl: 'https://example.com/activate',
    logoUrl: 'https://example.com/logo.png',
  })

  void renderEmail('account/reset-password', {
    code: 'VUE-2048',
    // @ts-expect-error expiresInMinutes must be a number
    expiresInMinutes: '15',
  })

  void renderEmail('account/reset-password', {
    code: 'VUE-2048',
    expiresInMinutes: 15,
    // @ts-expect-error extra props are rejected for object literals
    unregistered: true,
  })
}
