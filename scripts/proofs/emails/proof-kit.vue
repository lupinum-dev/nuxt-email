<script setup lang="ts">
/**
 * Proof template exercising every client-risk area in one email: a non-ASCII
 * subject (the em dash exercises the RFC 2047 encoded-word path), a preview text, an EFont webfont, Tailwind with a responsive (`sm:`)
 * and a dark-mode (`dark:`) variant, an MSO-padded EButton, a
 * Section/Row/Column table layout, EMarkdown with a heading, and two links whose
 * underline comes from the `underline` and `no-underline` classes.
 */
defineProps<{
  firstName: string
  dashboardUrl: string
}>()

const markdown = [
  '## Markdown block',
  '',
  'Spacing and **bold** plus a list:',
  '',
  '- first item',
  '- second item',
  '',
  'Inline `code` and a [link](https://example.invalid).',
].join('\n')
</script>

<template>
  <EEmail
    :subject="`Proof kit — every client-risk area (${firstName})`"
    lang="en"
    :preview="`${firstName}, your proof batch is ready to inspect.`"
    :style="{ backgroundColor: '#f3f5f4', fontFamily: 'Arial,sans-serif', padding: '32px 16px' }"
  >
    <template #head>
      <EFont
        font-family="Inter"
        :fallback-font-family="['Helvetica', 'sans-serif']"
        :web-font="{ url: 'https://fonts.example.invalid/inter.woff2', format: 'woff2' }"
      />
    </template>
    <EContainer
      :style="{ backgroundColor: '#ffffff', border: '1px solid #d9dfdc', borderRadius: '12px', maxWidth: '600px', padding: '40px' }"
    >
      <EHeading
        class="text-2xl sm:text-3xl dark:text-white"
        :style="{ color: '#17211c', margin: '0 0 16px' }"
      >
        Hello, {{ firstName }}
      </EHeading>
      <EText
        class="text-base dark:text-gray-200"
        :style="{ color: '#415148', lineHeight: '26px', margin: '0 0 24px' }"
      >
        This proof exercises every rendering risk area in a single email.
      </EText>
      <ESection :style="{ padding: '0 0 24px' }">
        <ERow>
          <EColumn :style="{ color: '#607067', fontSize: '13px' }">
            Table layout: left column
          </EColumn>
          <EColumn :style="{ color: '#607067', fontSize: '13px', textAlign: 'right' }">
            right column
          </EColumn>
        </ERow>
      </ESection>
      <ESection :style="{ padding: '0 0 28px' }">
        <EButton
          :href="dashboardUrl"
          :style="{ backgroundColor: '#16794d', borderRadius: '6px', color: '#ffffff', fontSize: '15px', fontWeight: '700', padding: '13px 20px' }"
        >
          Open your workspace
        </EButton>
      </ESection>
      <EHr :style="{ borderTopColor: '#d9dfdc', margin: '0 0 24px' }" />
      <EMarkdown :source="markdown" />
      <EText :style="{ color: '#415148', fontSize: '14px', margin: '24px 0 0' }">
        Link styles: <ELink
          class="underline"
          href="https://example.invalid/underlined"
          :style="{ color: '#16794d' }"
        >
          underlined link
        </ELink> and <ELink
          class="no-underline"
          href="https://example.invalid/plain"
          :style="{ color: '#16794d' }"
        >
          link without underline
        </ELink>.
      </EText>
      <EText :style="{ color: '#607067', fontSize: '13px', margin: '24px 0 0' }">
        Questions? Email <ELink href="mailto:proofs@example.invalid">
          proofs@example.invalid
        </ELink>.
      </EText>
    </EContainer>
  </EEmail>
</template>
