<script setup lang="ts">
import { defineEmail } from '@lupinum/nuxt-email/define-email'

defineOptions({ name: 'PlaygroundReleaseNotesEmail' })

interface ReleaseNotesProps {
  changelogUrl: string
  highlights: string
  productName: string
  recipientName: string
  version: string
}

const props = defineProps<ReleaseNotesProps>()

defineEmail({
  subject: () => `${props.productName} ${props.version} — what's new`,
})

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
            language="typescript"
            style="border-radius:8px;font-size:13px;padding:16px"
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
