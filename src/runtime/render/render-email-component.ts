import type { Component, FunctionalComponent, PublicProps } from 'vue'
import type { RenderedEmail } from './types'
import { createEmailRenderContext } from './define-email'
import { assertCompleteEmailDocument } from './document'
import { EmailRenderError } from './errors'
import { renderPlainText } from './plain-text'
import { renderComponentToHtml } from './render-component'

function componentName(component: Component): string {
  if ((typeof component === 'object' && component !== null) || typeof component === 'function') {
    if ('name' in component && typeof component.name === 'string' && component.name.length > 0) {
      return component.name
    }
    if ('__name' in component && typeof component.__name === 'string' && component.__name.length > 0) {
      return component.__name
    }
  }

  return 'AnonymousEmail'
}

type DeclaredComponentProps<ComponentType extends Component>
  = ComponentType extends abstract new (...args: infer _Arguments) => infer Instance
    ? Instance extends { $props: infer Props }
      ? Omit<Props, keyof PublicProps>
      : Record<string, unknown>
    : ComponentType extends FunctionalComponent<infer Props>
      ? Props
      : Record<string, unknown>

type RequiredPropKeys<Props> = {
  [Key in keyof Props]-?: Record<never, never> extends Pick<Props, Key> ? never : Key
}[keyof Props]

type RenderEmailComponentArguments<ComponentType extends Component>
  = keyof DeclaredComponentProps<ComponentType> extends never
    ? [props?: Record<string, never>]
    : RequiredPropKeys<DeclaredComponentProps<ComponentType>> extends never
      ? [props?: DeclaredComponentProps<ComponentType>]
      : [props: DeclaredComponentProps<ComponentType>]

export function renderEmailComponent<ComponentType extends Component>(
  component: ComponentType,
  ...args: RenderEmailComponentArguments<ComponentType>
): Promise<RenderedEmail>
export async function renderEmailComponent(
  component: Component,
  ...args: unknown[]
): Promise<RenderedEmail> {
  const props = (args[0] ?? {}) as Record<string, unknown>
  try {
    const context = createEmailRenderContext()
    const html = await renderComponentToHtml(component, props, context)
    assertCompleteEmailDocument(html)
    const subjectFactory = context.subject
    if (subjectFactory === undefined) {
      return {
        html,
        text: renderPlainText(html),
      }
    }
    const subject = subjectFactory()
    if (typeof subject !== 'string') {
      throw new TypeError(`defineEmail() subject must return a string; received ${typeof subject}`)
    }
    return {
      html,
      text: renderPlainText(html),
      subject,
    }
  }
  catch (error) {
    throw new EmailRenderError(componentName(component), error)
  }
}
