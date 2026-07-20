import { describe, expect, it } from 'vitest'
import { generateEmailRegistry, generateEmailTypes } from '../../src/template-generation'

const templates = [
  {
    name: '__proto__',
    sourcePath: '/project/app/emails/__proto__.vue',
  },
  {
    name: 'account/reset-password',
    sourcePath: '/project/app/emails/account/reset-password.vue',
  },
  {
    name: 'welcome',
    sourcePath: '/project/app/emails/welcome.vue',
  },
] as const

describe('email template generation', () => {
  it('generates one deterministic lazy server registry', () => {
    const runtimePaths = {
      emailRenderError: '/package/runtime/render/errors',
      renderEmailComponent: '/package/runtime/render/render-email-component',
      serverErrors: '/package/runtime/server/errors',
    }
    const first = generateEmailRegistry(templates, runtimePaths)
    const second = generateEmailRegistry(templates, runtimePaths)

    expect(first).toBe(second)
    expect(first).toContain('["__proto__"]: () => import("/project/app/emails/__proto__.vue")')
    expect(first).toContain('["account/reset-password"]: () => import("/project/app/emails/account/reset-password.vue")')
    expect(first).toContain('Object.hasOwn(emailTemplates, name)')
    expect(first).toContain('new UnknownEmailTemplateError(String(name), Object.keys(emailTemplates))')
    expect(first).toContain('const templateModule = await loader()')
    expect(first.indexOf('try {')).toBeLessThan(first.indexOf('const templateModule = await loader()'))
  })

  it('generates names and inferred Vue props from the same ordered templates', () => {
    const generated = generateEmailTypes(templates, {
      renderedEmail: '/package/runtime/render/types',
    })

    expect(generated).toContain('export const emailTemplates')
    expect(generated).toContain('"__proto__": () => Promise<typeof import("/project/app/emails/__proto__.vue")>')
    expect(generated).toContain('"account/reset-password": () => Promise<typeof import("/project/app/emails/account/reset-password.vue")>')
    expect(generated).toContain('export type EmailTemplateName = keyof typeof emailTemplates')
    expect(generated).toContain('keyof import(\'vue\').PublicProps')
    expect(generated).toContain('_EmailProps<Awaited<ReturnType<(typeof emailTemplates)[Name]>>[\'default\']>')
    expect(generated).toContain('name: Name,\n  props: NoInfer<EmailTemplateProps[Name]>')
    expect(generated).toContain('Promise<import("/package/runtime/render/types").RenderedEmail>')
    expect(generated).not.toContain('declare module')
    expect(generated).not.toContain('declare global')
  })
})
