const CONTENT_ATTRIBUTES = new Set(['innerHTML', 'textContent'])

export type SafeEmailAttributes<Attributes> = {
  [Key in keyof Attributes as Key extends 'innerHTML' | 'textContent'
    ? never
    : Key extends `on${string}`
      ? never
      : Key]: Attributes[Key]
}

export function assertSafeEmailAttributes(
  componentName: string,
  attributes: Readonly<Record<string, unknown>>,
): void {
  const unsafeAttributes = Object.keys(attributes).filter((name) => {
    return CONTENT_ATTRIBUTES.has(name) || (name.length > 2 && name.slice(0, 2).toLowerCase() === 'on')
  })

  if (unsafeAttributes.length > 0) {
    throw new TypeError(
      `${componentName} does not support unsafe HTML attribute${unsafeAttributes.length === 1 ? '' : 's'}: ${unsafeAttributes.join(', ')}`,
    )
  }
}
