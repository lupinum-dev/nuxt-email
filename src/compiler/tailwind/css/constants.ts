// Conditional at-rules: a rule inside one goes to <head>, because its declarations cannot be inlined.
export const NON_INLINABLE_ATRULES = new Set(['media', 'supports'])
