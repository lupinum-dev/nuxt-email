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
    fixturePath: '/project/app/emails/account/reset-password.fixtures.ts',
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
    expect(first).toContain('["__proto__"]: {\n    component: () => import("/project/app/emails/__proto__.vue")')
    expect(first).toContain('component: () => import("/project/app/emails/account/reset-password.vue")')
    expect(first).toContain('fixture: () => import("/project/app/emails/account/reset-password.fixtures.ts")')
    expect(first).toContain('Object.hasOwn(emailTemplates, name)')
    expect(first).toContain('new UnknownEmailTemplateError(String(name), Object.keys(emailTemplates))')
    expect(first).toContain('const templateModule = await loader.component()')
    expect(first.indexOf('try {')).toBeLessThan(first.indexOf('const templateModule = await loader.component()'))
    expect(first.match(/export const emailTemplates/g)).toHaveLength(1)
  })

  it('generates names and inferred Vue props from the same ordered templates', () => {
    const generated = generateEmailTypes(templates, {
      renderedEmail: '/package/runtime/render/types',
    })

    expect(generated).toContain('export const emailTemplates')
    expect(generated).toContain('"__proto__": {\n    component: () => Promise<typeof import("/project/app/emails/__proto__.vue")>')
    expect(generated).toContain('component: () => Promise<typeof import("/project/app/emails/account/reset-password.vue")>')
    expect(generated).toContain('fixture: () => Promise<typeof import("/project/app/emails/account/reset-password.fixtures.ts")>')
    expect(generated).toContain('export type EmailTemplateName = keyof typeof emailTemplates')
    expect(generated).toContain('keyof import(\'vue\').PublicProps')
    expect(generated).toContain('_EmailProps<Awaited<ReturnType<(typeof emailTemplates)[Name][\'component\']>>[\'default\']>')
    expect(generated).toContain('name: Name,\n  props: NoInfer<EmailTemplateProps[Name]>')
    expect(generated).toContain('Promise<import("/package/runtime/render/types").RenderedEmail>')
    expect(generated).not.toContain('declare module')
    expect(generated).not.toContain('declare global')
  })

  it('omits every fixture import when production discovery did not attach fixtures', () => {
    const productionTemplates = templates.map(template => ({
      name: template.name,
      sourcePath: template.sourcePath,
    }))
    const generated = generateEmailRegistry(productionTemplates, {
      emailRenderError: '/package/runtime/render/errors',
      renderEmailComponent: '/package/runtime/render/render-email-component',
      serverErrors: '/package/runtime/server/errors',
    })

    expect(generated).not.toContain('.fixtures.ts')
    expect(generated).not.toContain('fixture:')
  })
})
