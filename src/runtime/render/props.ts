import type { Component } from 'vue'

type ComponentWithProps = Component & {
  props?: readonly string[] | Record<string, unknown>
}

function describe(value: unknown): string {
  if (value === null) return 'null'
  return Array.isArray(value) ? 'an array' : typeof value
}

export function assertKnownProps(component: Component, props: unknown): asserts props is Record<string, unknown> {
  // The public type asks for an object; plain JavaScript callers can still pass anything.
  if (typeof props !== 'object' || props === null || Array.isArray(props)) {
    throw new TypeError(`Email props must be an object; received ${describe(props)}`)
  }
  const declaration = (component as ComponentWithProps).props
  // A functional component may carry a TypeScript props contract without Vue
  // runtime prop metadata. Its public helper call remains statically checked,
  // but there is nothing sound to validate here at runtime.
  if (typeof component === 'function' && declaration === undefined) {
    return
  }
  const knownProps = new Set(Array.isArray(declaration) ? declaration : Object.keys(declaration ?? {}))
  const unknownProps = Object.keys(props).filter(name => !knownProps.has(name)).sort()

  if (unknownProps.length > 0) {
    throw new TypeError(`Unknown email component prop${unknownProps.length === 1 ? '' : 's'}: ${unknownProps.join(', ')}`)
  }

  if (Array.isArray(declaration) || declaration === undefined) {
    return
  }

  const missingProps = Object.entries(declaration)
    .filter(([name, option]) => {
      return typeof option === 'object'
        && option !== null
        && 'required' in option
        && option.required === true
        && (props as Record<string, unknown>)[name] === undefined
    })
    .map(([name]) => name)
    .sort()

  if (missingProps.length > 0) {
    throw new TypeError(`Missing required email component prop${missingProps.length === 1 ? '' : 's'}: ${missingProps.join(', ')}`)
  }
}
