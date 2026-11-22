import type { Component } from 'vue'
import type { EmailTag } from './email-tags'
import { EButton } from './EButton'
import { ECodeInline } from './ECodeInline'
import { EColumn } from './EColumn'
import { EContainer } from './EContainer'
import { EEmail } from './EEmail'
import { EFont } from './EFont'
import { EHeading } from './EHeading'
import { EHr } from './EHr'
import { EImg } from './EImg'
import { ELink } from './ELink'
import { EMarkdown } from './EMarkdown'
import { ERow } from './ERow'
import { ESection } from './ESection'
import { EText } from './EText'

const components = {
  EButton,
  ECodeInline,
  EColumn,
  EContainer,
  EEmail,
  EFont,
  EHeading,
  EHr,
  EImg,
  ELink,
  EMarkdown,
  ERow,
  ESection,
  EText,
}

type Missing = Exclude<EmailTag, keyof typeof components>
type Unexpected = Exclude<keyof typeof components, EmailTag>

/** Registry of the build-time Tailwind path; it must name exactly {@link EMAIL_TAGS}. */
export const emailComponents: [Missing, Unexpected] extends [never, never]
  ? Readonly<Record<EmailTag, Component>>
  : never = Object.freeze(components)
