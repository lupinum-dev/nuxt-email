declare module '#nuxt-email/registry' {
  interface EmailTemplateRegistryEntry {
    component: () => Promise<{ default: import('vue').Component }>
    fixture?: () => Promise<{ default: unknown }>
  }

  export const emailTemplates: Readonly<Record<string, EmailTemplateRegistryEntry>>

  export function renderEmail(
    name: string,
    props: Record<string, unknown>,
  ): Promise<import('../render/types').RenderedEmail>
}
