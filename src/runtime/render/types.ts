import type { FunctionalComponent, PublicProps } from 'vue'

export type EmailComponentProps<ComponentType>
  = ComponentType extends abstract new (...args: never[]) => { $props: infer Props }
    ? Omit<Props, keyof PublicProps>
    : ComponentType extends FunctionalComponent<infer Props>
      ? Props
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
