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

type RequiredKeys<Props> = { [Key in keyof Props]-?: Record<never, never> extends Pick<Props, Key> ? never : Key }[keyof Props]

/** The props argument of `renderEmail`: optional when the template has no required props. */
export type EmailRenderArgs<Props> = [RequiredKeys<Props>] extends [never] ? [props?: Props] : [props: Props]
