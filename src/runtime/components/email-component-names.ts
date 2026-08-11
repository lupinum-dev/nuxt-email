export const EMAIL_COMPONENT_NAMES = [
  'EBody',
  'EButton',
  'ECodeInline',
  'EColumn',
  'EContainer',
  'EFont',
  'EHead',
  'EHeading',
  'EHr',
  'EHtml',
  'EImg',
  'ELink',
  'EMarkdown',
  'EPreview',
  'ERow',
  'ESection',
  'ETailwind',
  'EText',
] as const

export type EmailComponentName = typeof EMAIL_COMPONENT_NAMES[number]
