import type { Component } from 'vue'
import type { EmailComponentName } from './email-component-names'
import * as emailComponents from './index'

type MissingComponent = Exclude<EmailComponentName, keyof typeof emailComponents>
type UnexpectedComponent = Exclude<keyof typeof emailComponents, EmailComponentName>
type ExactComponentRegistry = [MissingComponent, UnexpectedComponent] extends [never, never]
  ? Readonly<Record<EmailComponentName, Component>>
  : never

export const emailComponentRegistry: ExactComponentRegistry = Object.freeze({ ...emailComponents })
