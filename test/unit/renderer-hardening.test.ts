import { defineComponent, h } from 'vue'
import { describe, expect, it } from 'vitest'
import { EBody, EHtml } from '../../src/runtime/components'
import { renderEmailComponent } from '../../src/runtime/render/render-email-component'
import {
  LARGE_EMAIL_PAYLOAD,
  LARGE_EMAIL_ROWS,
  LargeEmail,
} from '../fixtures/LargeEmail'
import { measureRenderer } from '../performance/measure-renderer'

describe('renderer hardening', () => {
  it('escapes attributes and text while preserving international content in plain text', async () => {
    const attributeValue = `'"<& — Grüß 你好 👩🏽‍💻`
    const textValue = `'"<& — Grüß 你好 👩🏽‍💻`
    const EscapingEmail = defineComponent({
      name: 'EscapingEmail',
      setup: () => () => h(EHtml, { lang: 'en' }, {
        default: () => h(EBody, null, {
          default: () => h('p', { 'data-value': attributeValue }, [
            textValue,
            h('a', { href: `https://example.com/?value=${attributeValue}` }, 'Open'),
          ]),
        }),
      }),
    })

    const result = await renderEmailComponent(EscapingEmail)

    expect(result.html).toContain('data-value="&#39;&quot;&lt;&amp; — Grüß 你好 👩🏽‍💻"')
    expect(result.html).toContain('>&#39;&quot;&lt;&amp; — Grüß 你好 👩🏽‍💻')
    expect(result.html).toContain('href="https://example.com/?value=&#39;&quot;&lt;&amp; — Grüß 你好 👩🏽‍💻"')
    expect(result.text).toContain(textValue)
    expect(result.text).toContain(`Open https://example.com/?value=${attributeValue}`)
  })

  it('preserves high-byte content without normalization or truncation', async () => {
    const payload = 'é€👩🏽‍💻é'.repeat(512)
    const HighByteEmail = defineComponent({
      name: 'HighByteEmail',
      props: {
        payload: { type: String, required: true },
      },
      setup: props => () => h('html', [h('body', [h('p', props.payload)])]),
    })

    const first = await renderEmailComponent(HighByteEmail, { payload })
    const second = await renderEmailComponent(HighByteEmail, { payload })

    expect(first).toEqual(second)
    expect(first.text).toBe(payload)
    expect(Buffer.byteLength(first.text, 'utf8')).toBeGreaterThan(first.text.length)
  })

  it('renders a stable large template identically across 100 warm renders', async () => {
    const measurement = await measureRenderer(LargeEmail, {
      payload: LARGE_EMAIL_PAYLOAD,
      rows: LARGE_EMAIL_ROWS,
    }, 100)

    expect(measurement.coldMilliseconds).toBeGreaterThanOrEqual(0)
    expect(measurement.medianWarmMilliseconds).toBeGreaterThanOrEqual(0)
    expect(measurement.htmlBytes).toBeGreaterThan(20_000)
    expect(measurement.textBytes).toBeGreaterThan(10_000)
  })
})
