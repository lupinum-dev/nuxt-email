import type { DiscoveredEmailTemplate } from './discovery'

interface RegistryTypePaths {
  renderedEmail: string
}

function importPath(path: string): string {
  return JSON.stringify(path.replaceAll('\\', '/'))
}

interface RendererRegistryPaths {
  createEmailRenderer: string
  styleTable: string
  /** Generated `ECodeBlock` module when the `codeBlock` option is set. */
  codeBlock?: string
  /**
   * Development and tests only: also export `inspectEmail`, imported as `createEmailInspector`
   * from the `createEmailRenderer` module. The production registry never exports it.
   */
  inspect?: boolean
}

function templateEntries(templates: readonly DiscoveredEmailTemplate[]): string {
  return templates.map((template) => {
    const fixture = template.fixturePath
      ? `\n    fixture: () => import(${importPath(template.fixturePath)}),`
      : ''

    return `  [${JSON.stringify(template.name)}]: {
    component: () => import(${importPath(template.sourcePath)}),${fixture}
  },`
  }).join('\n')
}

/** Registry for the build-time Tailwind renderer (`#nuxt-email/registry`). */
export function generateEmailRendererRegistry(
  templates: readonly DiscoveredEmailTemplate[],
  paths: RendererRegistryPaths,
): string {
  const codeBlock = paths.codeBlock === undefined
    ? ''
    : `import { ECodeBlock } from ${importPath(paths.codeBlock.replace(/\.ts$/, ''))}\n`
  const imports = paths.inspect ? 'createEmailInspector, createEmailRenderer' : 'createEmailRenderer'
  const inspect = paths.inspect ? '\nexport const inspectEmail = createEmailInspector(options)\n' : ''
  return `import { ${imports} } from ${importPath(paths.createEmailRenderer)}
import styleTable from ${importPath(paths.styleTable)}
${codeBlock}
export const emailTemplates = Object.freeze({
${templateEntries(templates)}
})

const options = {
  templates: emailTemplates,
  styleTable,
  components: { ${paths.codeBlock === undefined ? '' : 'ECodeBlock '}},
}

export const renderEmail = createEmailRenderer(options)
${inspect}`
}

export function generateEmailTypes(
  templates: readonly DiscoveredEmailTemplate[],
  typePaths: RegistryTypePaths,
): string {
  const entries = templates.map((template) => {
    const fixture = template.fixturePath
      ? `\n    fixture: () => Promise<typeof import(${importPath(template.fixturePath)})>`
      : ''

    return `  ${JSON.stringify(template.name)}: {
    component: () => Promise<typeof import(${importPath(template.sourcePath)})>${fixture}
  }`
  })

  return `export const emailTemplates: Readonly<{
${entries.join('\n')}
}>

export type EmailTemplateName = keyof typeof emailTemplates
type _EmailProps<Component> = keyof import(${importPath(typePaths.renderedEmail)}).EmailComponentProps<Component> extends never
  ? Record<string, never>
  : import(${importPath(typePaths.renderedEmail)}).EmailComponentProps<Component>

export type EmailTemplateProps = {
  [Name in EmailTemplateName]: _EmailProps<Awaited<ReturnType<(typeof emailTemplates)[Name]['component']>>['default']>
}

export function renderEmail<Name extends EmailTemplateName>(
  name: Name,
  props: NoInfer<EmailTemplateProps[Name]>,
): Promise<import(${importPath(typePaths.renderedEmail)}).RenderedEmail>
`
}
