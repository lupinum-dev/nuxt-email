import {
  EBody,
  EButton,
  EColumn,
  EContainer,
  EHead,
  EHeading,
  EHr,
  EHtml,
  EImg,
  ELink,
  EPreview,
  ERow,
  ESection,
  EmailRenderError,
  EText,
  renderEmailComponent,
} from '../../src/runtime/core'
import { describe, expect, it } from 'vitest'

describe('public core API', () => {
  it('exports the canonical renderer and supported Vue primitive set', () => {
    expect(renderEmailComponent).toBeTypeOf('function')
    expect(EmailRenderError).toBeTypeOf('function')
    expect([
      EHtml,
      EHead,
      EBody,
      EPreview,
      EContainer,
      ESection,
      ERow,
      EColumn,
      EText,
      EHeading,
      ELink,
      EImg,
      EHr,
      EButton,
    ]).toHaveLength(14)
  })
})
