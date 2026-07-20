import type { Component } from 'vue'
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

export async function renderEmailComponent(
  component: Component,
  props: Record<string, unknown> = {},
): Promise<RenderedEmail> {
  try {
    const context = createEmailRenderContext()
    const html = await renderComponentToHtml(component, props, context)
    assertCompleteEmailDocument(html)
    const subject = context.subject?.(props)
    return {
      html,
      text: renderPlainText(html),
      ...(subject === undefined ? {} : { subject }),
    }
  }
  catch (error) {
    throw new EmailRenderError(componentName(component), error)
  }
}
