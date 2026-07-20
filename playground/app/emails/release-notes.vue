<script setup lang="ts">
defineOptions({ name: 'PlaygroundReleaseNotesEmail' })

interface ReleaseNotesProps {
  changelogUrl: string
  highlights: string
  productName: string
  recipientName: string
  version: string
}

defineProps<ReleaseNotesProps>()

// `defineEmail` is auto-imported by the module. The subject is computed from the
// same typed props `renderEmail('release-notes', props)` receives, and surfaces in
// the preview's subject bar and on the render result.
defineEmail<ReleaseNotesProps>({
  subject: props => `${props.productName} ${props.version} — what's new`,
})

// ECodeBlock's `theme` is a plain style map; a template can define one inline
// without importing a named theme.
const codeTheme: Record<string, Record<string, string>> = {
  base: {
    background: '#0d1117',
    borderRadius: '8px',
    color: '#c9d1d9',
    fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
    fontSize: '13px',
    overflow: 'auto',
    padding: '16px',
    whiteSpace: 'pre-wrap',
  },
  comment: { color: '#8b949e' },
  function: { color: '#d2a8ff' },
  keyword: { color: '#ff7b72' },
  number: { color: '#79c0ff' },
  string: { color: '#a5d6ff' },
}

const usageSnippet = `// server/api/release-notes.get.ts
export default defineEventHandler(() => {
  return renderEmail('release-notes', {
    productName: 'Northstar',
    version: 'v2.4',
  })
})`
</script>

<template>
  <EHtml
    lang="en"
    data-nuxt-email-template="NUXT_EMAIL_PLAYGROUND_RELEASE_NOTES_9C0F"
  >
    <EHead>
      <title>{{ productName }} {{ version }}</title>
    </EHead>
    <EBody style="background-color:#f3f5f4;font-family:Arial,sans-serif;padding:32px 16px">
      <EPreview>{{ productName }} {{ version }} — {{ highlights }}</EPreview>
      <ETailwind>
        <EContainer class="max-w-[600px] rounded-xl border border-solid border-[#d9dfdc] bg-white p-10">
          <EText class="m-0 mb-6 text-sm font-bold text-emerald-700">
            {{ productName }} · Release notes
          </EText>
          <EHeading class="m-0 mb-4 text-3xl leading-9 text-[#17211c]">
            {{ version }} is out
          </EHeading>
          <EText class="m-0 mb-6 text-base leading-7 text-[#415148]">
            Hi {{ recipientName }}, here is what changed in this release.
          </EText>

          <EMarkdown :source="highlights" />

          <EHeading
            as="h2"
            class="m-0 mb-3 mt-6 text-lg text-[#17211c]"
          >
            Render it from your server
          </EHeading>
          <ECodeBlock
            :code="usageSnippet"
            :theme="codeTheme"
            language="typescript"
          />

          <ESection class="pb-1 pt-7">
            <EButton
              :href="changelogUrl"
              class="rounded-md bg-emerald-700 px-5 py-3 text-sm font-bold text-white"
            >
              Read the full changelog
            </EButton>
          </ESection>
        </EContainer>
      </ETailwind>
    </EBody>
  </EHtml>
</template>
