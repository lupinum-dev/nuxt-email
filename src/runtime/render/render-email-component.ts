import type { Component } from 'vue'
import type { EmailComponentRegistry } from './render-component'
import type { EmailComponentProps, RenderedEmail } from './types'
import { emailComponentRegistry } from '../components/email-component-registry'
import { createEmailRenderContext } from './define-email'
import { assertCompleteEmailDocument } from './document'
import { EmailRenderError } from './errors'
import { renderPlainText } from './plain-text'
import { renderComponentToHtml } from './render-component'

function templateName(component: Component): string {
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

type RequiredPropKeys<Props> = {
  [Key in keyof Props]-?: Record<never, never> extends Pick<Props, Key> ? never : Key
}[keyof Props]

type RenderEmailComponentArguments<ComponentType extends Component>
  = keyof EmailComponentProps<ComponentType> extends never
    ? [props?: Record<string, never>]
    : RequiredPropKeys<EmailComponentProps<ComponentType>> extends never
      ? [props?: EmailComponentProps<ComponentType>]
      : [props: EmailComponentProps<ComponentType>]

export interface RenderEmailComponent {
  <ComponentType extends Component>(
    component: ComponentType,
    ...args: RenderEmailComponentArguments<ComponentType>
  ): Promise<RenderedEmail>
}

export function createRenderEmailComponent(
  componentRegistry: EmailComponentRegistry,
): RenderEmailComponent {
  return async (component: Component, ...args: unknown[]): Promise<RenderedEmail> => {
    const props = (args[0] ?? {}) as Record<string, unknown>
    try {
      const context = createEmailRenderContext()
      const html = await renderComponentToHtml(component, props, context, componentRegistry)
      assertCompleteEmailDocument(html)
      const resolveMetadata = (name: 'subject' | 'text', factory: (() => string) | undefined) => {
        if (!factory) return undefined
        const value = factory()
        if (typeof value !== 'string') {
          throw new TypeError(`defineEmail() ${name} must return a string; received ${typeof value}`)
        }
        return value
      }

      const subject = resolveMetadata('subject', context.metadata?.subject)
      const text = resolveMetadata('text', context.metadata?.text) ?? renderPlainText(html)
      const result: RenderedEmail = {
        html,
        text,
      }
      if (subject !== undefined) result.subject = subject
      return result
    }
    catch (error) {
      throw new EmailRenderError(templateName(component), error)
    }
  }
}

export const renderEmailComponent = createRenderEmailComponent(emailComponentRegistry)
