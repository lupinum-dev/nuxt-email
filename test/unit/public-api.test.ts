import NuxtEmail, {
  EBody,
  EHead,
  EHeading,
  EHr,
  EHtml,
  EImg,
  ELink,
  EmailRenderError,
  EText,
  renderEmailComponent,
} from '../../src/module'
import { describe, expect, it } from 'vitest'

describe('Phase 1 public API', () => {
  it('exports one Nuxt module, renderer, error, and supported primitive set', () => {
    expect(NuxtEmail).toBeTypeOf('function')
    expect(renderEmailComponent).toBeTypeOf('function')
    expect(EmailRenderError).toBeTypeOf('function')
    expect([EHtml, EHead, EBody, EText, EHeading, ELink, EImg, EHr])
      .toHaveLength(8)
  })
})
