import type { Component } from 'vue'
import type { RenderedEmail } from './types'
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
    const html = await renderComponentToHtml(component, props)
    return {
      html,
      text: renderPlainText(html),
    }
  }
  catch (error) {
    throw new EmailRenderError(componentName(component), error)
  }
}
