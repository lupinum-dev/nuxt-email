import type { FunctionalComponent } from 'vue'
import { defineComponent, h } from 'vue'
import { renderEmailComponent } from '../../src/runtime/testing'

const RequiredEmail = defineComponent({
  props: {
    count: { type: Number, required: true },
    name: { type: String, required: true },
    note: { type: String, required: false },
  },
})

void renderEmailComponent(RequiredEmail, { count: 1, name: 'Ada' })
void renderEmailComponent(RequiredEmail, { count: 1, name: 'Ada', note: 'Hello' })
// @ts-expect-error required props cannot be omitted
void renderEmailComponent(RequiredEmail)
// @ts-expect-error count is required
void renderEmailComponent(RequiredEmail, { name: 'Ada' })
// @ts-expect-error count must be numeric
void renderEmailComponent(RequiredEmail, { count: '1', name: 'Ada' })
// @ts-expect-error undeclared props are rejected
void renderEmailComponent(RequiredEmail, { count: 1, name: 'Ada', extra: true })

const OptionalEmail = defineComponent({
  props: {
    name: { type: String, required: false },
  },
})

void renderEmailComponent(OptionalEmail)
void renderEmailComponent(OptionalEmail, {})
void renderEmailComponent(OptionalEmail, { name: 'Ada' })

const PropFreeEmail = defineComponent({})
void renderEmailComponent(PropFreeEmail)
void renderEmailComponent(PropFreeEmail, {})
// @ts-expect-error prop-free templates reject arbitrary props
void renderEmailComponent(PropFreeEmail, { extra: true })

const FunctionalEmail: FunctionalComponent<{ name: string }> = props => h('html', props.name)
void renderEmailComponent(FunctionalEmail, { name: 'Ada' })
// @ts-expect-error functional component props stay statically checked
void renderEmailComponent(FunctionalEmail, {})
