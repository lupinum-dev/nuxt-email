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

interface TransactionalInput {
  activationUrl: string
  firstName: string
  logoUrl: string
}

interface PasswordResetInput {
  code: string
  expiresInMinutes: number
}

const emailDispatch = {
  transactional: (input: TransactionalInput) => renderEmail('transactional', input),
  passwordReset: (input: PasswordResetInput) => renderEmail('account/reset-password', input),
} as const

void emailDispatch.transactional({
  activationUrl: 'https://example.com/activate',
  firstName: 'Ada',
  logoUrl: 'https://example.com/logo.png',
})

const invalidEmailDispatch = {
  // @ts-expect-error a dispatch entry cannot use an unknown registry name
  unknown: (input: PasswordResetInput) => renderEmail('unknown', input),
  // @ts-expect-error a dispatch entry must supply the selected template's props
  invalidProps: (input: PasswordResetInput) => renderEmail('transactional', input),
}

void invalidEmailDispatch
