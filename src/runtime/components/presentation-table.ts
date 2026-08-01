const FIXED_PRESENTATION_TABLE_ATTRIBUTES = new Set(['border', 'cellpadding', 'cellspacing', 'role'])

/**
 * The presentation-table primitives (ERow, ESection, EContainer) hard-code
 * border, cellpadding, cellspacing, and role to keep the email-client-safe
 * layout invariant. React Email lets callers override them (props spread after
 * the defaults); nuxt-email throws instead of silently discarding the override.
 */
export function assertFixedPresentationTable(
  componentName: string,
  attributes: Readonly<Record<string, unknown>>,
): void {
  const overrides = Object.keys(attributes).filter(
    name => FIXED_PRESENTATION_TABLE_ATTRIBUTES.has(name.toLowerCase()),
  )

  if (overrides.length > 0) {
    throw new TypeError(
      `${componentName} does not allow overriding fixed presentation-table attribute${overrides.length === 1 ? '' : 's'}: ${overrides.join(', ')}; border, cellpadding, cellspacing, and role are fixed to preserve the email-client-safe table layout`,
    )
  }
}
