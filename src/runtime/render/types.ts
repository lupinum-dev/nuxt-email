import type { FunctionalComponent, PublicProps } from 'vue'

type VueListenerProp = `on${Capitalize<string>}`
type EmailAuthoringProps<Props> = string extends keyof Props
  ? Props
  : Omit<Props, keyof PublicProps | VueListenerProp>

export type EmailComponentProps<ComponentType>
  = ComponentType extends abstract new (...args: never[]) => { $props: infer Props }
    ? EmailAuthoringProps<Props>
    : ComponentType extends FunctionalComponent<infer Props>
      ? EmailAuthoringProps<Props>
      : never

export interface RenderedEmail {
  html: string
  text: string
  /**
   * Subject line declared by the template via `defineEmail`. Absent when the
   * template does not call `defineEmail`.
   */
  subject?: string
}
