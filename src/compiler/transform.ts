import type { CompilerOptions } from 'vue/compiler-sfc'
import { camelize, capitalize } from 'vue'
import { EMAIL_TAGS } from '../runtime/components/email-tags'

// `@vue/compiler-core` is not a direct dependency, so its node types are derived
// from the public `vue/compiler-sfc` options. The numeric values are the
// compiler-core `NodeTypes`, `ElementTypes` and `ConstantTypes` enums.
type NodeTransform = NonNullable<CompilerOptions['nodeTransforms']>[number]
type TemplateNode = Parameters<NodeTransform>[0]
type ElementNode = Extract<TemplateNode, { tagType: unknown }>
type Prop = ElementNode['props'][number]
type DirectiveNode = Extract<Prop, { modifiers: unknown }>
type AttributeNode = Exclude<Prop, DirectiveNode>
type ExpressionNode = NonNullable<DirectiveNode['exp']>
type CompoundExpressionNode = Extract<ExpressionNode, { children: unknown }>
type CompoundChild = CompoundExpressionNode['children'][number]

const ELEMENT = 1
const ATTRIBUTE = 6
const DIRECTIVE = 7
const SIMPLE_EXPRESSION = 4
const COMPOUND_EXPRESSION = 8
const PLAIN_ELEMENT = 0
const COMPONENT = 1
const NOT_CONSTANT = 0

type Part = AttributeNode | DirectiveNode
type TransformContext = Parameters<NodeTransform>[1]

// `<component :is>` resolves at render; every other tag must be known at build time.
const DYNAMIC_COMPONENT = 'component'
const CODE_BLOCK = 'ECodeBlock'

/**
 * A component tag must be an import of the template's script or a registered
 * email component. Without this, Vue renders an unknown tag as an element.
 */
function assertKnownComponent(tag: string, pascal: string, tags: ReadonlySet<string>, context: TransformContext): void {
  if (tag === DYNAMIC_COMPONENT || tags.has(pascal)) return
  const bindings = context.bindingMetadata
  if ([tag, camelize(tag), pascal].some(name => Object.hasOwn(bindings, name))) return
  if (pascal === CODE_BLOCK) {
    throw new TypeError(`<ECodeBlock> in ${context.filename} needs the nuxtEmail codeBlock module option.`)
  }
  throw new TypeError(
    `Unknown email component <${tag}> in ${context.filename}. Import it in the template's script or use a registered E* component.`,
  )
}

interface TailwindTransformOptions {
  /** Registered email component tags; they receive camelCase style keys. */
  tags?: readonly string[]
}

function boundName(prop: Prop): string | undefined {
  if (prop.type === ATTRIBUTE) return prop.name
  if (prop.name !== 'bind' || prop.arg?.type !== SIMPLE_EXPRESSION || !prop.arg.isStatic) return undefined
  return prop.arg.content
}

function partValue(part: Part): CompoundChild[] {
  if (part.type === ATTRIBUTE) return [JSON.stringify(part.value?.content ?? '')]
  return part.exp ? ['(', part.exp, ')'] : ['undefined']
}

function joinParts(parts: Part[]): CompoundChild[] {
  if (parts.length === 0) return ['undefined']
  if (parts.length === 1) return partValue(parts[0]!)
  return ['[', ...parts.flatMap((part, index) => [...(index > 0 ? [', '] : []), ...partValue(part)]), ']']
}

/**
 * Rewrites `class`, `:class`, `style` and `:style` on every native element and
 * component tag into one `v-bind="_tw(classes, styles)"`, so Tailwind classes
 * resolve through the build-time style table at render. Elements without a class
 * are left untouched. Also rejects component tags that are neither imported nor
 * registered email components.
 *
 * Runs after Vue's own transforms: binding expressions are already prefixed
 * (`_ctx.x`) and a static `style` is already a `:style` object.
 */
export function createTailwindTransform(options: TailwindTransformOptions = {}): NodeTransform {
  const tags: ReadonlySet<string> = new Set(options.tags ?? EMAIL_TAGS)
  return (node, context) => transformElement(node, tags, context)
}

function transformElement(node: TemplateNode, tags: ReadonlySet<string>, context: TransformContext): void {
  if (node.type !== ELEMENT || (node.tagType !== PLAIN_ELEMENT && node.tagType !== COMPONENT)) return
  // `<e-button>` and `<EButton>` name the same registered component.
  const pascal = capitalize(camelize(node.tag))
  if (node.tagType === COMPONENT) assertKnownComponent(node.tag, pascal, tags, context)
  const classes: Part[] = []
  const styles: Part[] = []
  let insertAt = -1
  const kept: Prop[] = []
  for (const prop of node.props) {
    const name = boundName(prop)
    const bucket = name === 'class' ? classes : name === 'style' ? styles : undefined
    if (bucket === undefined) {
      kept.push(prop)
      continue
    }
    if (insertAt === -1) insertAt = kept.length
    bucket.push(prop)
  }
  if (classes.length === 0) return

  const exp: CompoundExpressionNode = {
    type: COMPOUND_EXPRESSION,
    loc: node.loc,
    children: [
      // A non-constant node keeps Vue from hoisting the call out of the render function.
      { type: SIMPLE_EXPRESSION, content: '_ctx._tw', isStatic: false, constType: NOT_CONSTANT, loc: node.loc },
      '(',
      ...joinParts(classes),
      ', ',
      ...joinParts(styles),
      ...(node.tagType === COMPONENT && tags.has(pascal) ? [', true'] : []),
      ')',
    ],
  }
  const binding: DirectiveNode = {
    type: DIRECTIVE,
    name: 'bind',
    rawName: 'v-bind',
    exp,
    arg: undefined,
    modifiers: [],
    loc: node.loc,
  }
  kept.splice(insertAt, 0, binding)
  node.props = kept
}
