import type { DiscoveredEmailTemplate } from './template-discovery'

export interface RegistryRuntimePaths {
  emailRenderError: string
  renderEmailComponent: string
  serverErrors: string
}

export interface RegistryTypePaths {
  renderedEmail: string
}

function importPath(path: string): string {
  return JSON.stringify(path.replaceAll('\\', '/'))
}

export function generateEmailRegistry(
  templates: readonly DiscoveredEmailTemplate[],
  runtimePaths: RegistryRuntimePaths,
): string {
  const entries = templates.map((template) => {
    return `  [${JSON.stringify(template.name)}]: () => import(${importPath(template.sourcePath)}),`
  })

  return `import { EmailRenderError } from ${importPath(runtimePaths.emailRenderError)}
import { renderEmailComponent } from ${importPath(runtimePaths.renderEmailComponent)}
import { UnknownEmailTemplateError } from ${importPath(runtimePaths.serverErrors)}

export const emailTemplates = Object.freeze({
${entries.join('\n')}
})

export async function renderEmail(name, props) {
  const loader = typeof name === 'string' && Object.hasOwn(emailTemplates, name)
    ? emailTemplates[name]
    : undefined
  if (!loader) {
    throw new UnknownEmailTemplateError(String(name), Object.keys(emailTemplates))
  }

  try {
    const templateModule = await loader()
    return await renderEmailComponent(templateModule.default, props)
  }
  catch (error) {
    throw new EmailRenderError(name, error instanceof EmailRenderError ? error.cause : error)
  }
}
`
}

export function generateEmailTypes(
  templates: readonly DiscoveredEmailTemplate[],
  typePaths: RegistryTypePaths,
): string {
  const entries = templates.map((template) => {
    return `  ${JSON.stringify(template.name)}: () => Promise<typeof import(${importPath(template.sourcePath)})>`
  })

  return `export const emailTemplates: Readonly<{
${entries.join('\n')}
}>

export type EmailTemplateName = keyof typeof emailTemplates
type _EmailComponent = abstract new (...args: never[]) => { $props: object }
type _DeclaredEmailProps<Component extends _EmailComponent> = Omit<
  InstanceType<Component>['$props'],
  keyof import('vue').PublicProps
>
type _EmailProps<Component extends _EmailComponent> = keyof _DeclaredEmailProps<Component> extends never
  ? Record<string, never>
  : _DeclaredEmailProps<Component>

export type EmailTemplateProps = {
  [Name in EmailTemplateName]: _EmailProps<Awaited<ReturnType<(typeof emailTemplates)[Name]>>['default']>
}

export function renderEmail<Name extends EmailTemplateName>(
  name: Name,
  props: NoInfer<EmailTemplateProps[Name]>,
): Promise<import(${importPath(typePaths.renderedEmail)}).RenderedEmail>
`
}
