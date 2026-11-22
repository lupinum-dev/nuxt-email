/**
 * The components a template on the build-time Tailwind path can use without an
 * import. The compiler rejects any other unimported component tag; the renderer
 * registry is type-checked against this list.
 */
export const EMAIL_TAGS = [
  'EButton',
  'ECodeInline',
  'EColumn',
  'EContainer',
  'EEmail',
  'EFont',
  'EHeading',
  'EHr',
  'EImg',
  'ELink',
  'EMarkdown',
  'ERow',
  'ESection',
  'EText',
] as const

export type EmailTag = typeof EMAIL_TAGS[number]
