import { describe, expect, it } from 'vitest'
import {
  generateEmailRendererRegistry,
} from '../../../src/template-registry/generation'

const registryPaths = {
  createEmailRenderer: '/package/runtime/render-email',
  styleTable: 'virtual:nuxt-email-style-table',
}

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
    const first = generateEmailRendererRegistry(templates, registryPaths)
    const second = generateEmailRendererRegistry(templates, registryPaths)

    expect(first).toBe(second)
    expect(first).toContain('["__proto__"]: {\n    component: () => import("/project/app/emails/__proto__.vue")')
    expect(first).toContain('component: () => import("/project/app/emails/account/reset-password.vue")')
    expect(first).toContain('fixture: () => import("/project/app/emails/account/reset-password.fixtures.ts")')
    expect(first.match(/export const emailTemplates/g)).toHaveLength(1)
    expect(first).not.toContain('inspectEmail')
  })

  it('exports inspectEmail only from the development registry', () => {
    const generated = generateEmailRendererRegistry(templates, { ...registryPaths, inspect: true })

    expect(generated).toContain('import { createEmailInspector, createEmailRenderer } from "/package/runtime/render-email"')
    expect(generated).toContain('export const inspectEmail = createEmailInspector(options)')
  })

  it('omits every fixture import when production discovery did not attach fixtures', () => {
    const productionTemplates = templates.map(template => ({
      name: template.name,
      sourcePath: template.sourcePath,
    }))
    const generated = generateEmailRendererRegistry(productionTemplates, registryPaths)

    expect(generated).not.toContain('.fixtures.ts')
    expect(generated).not.toContain('fixture:')
  })
})
