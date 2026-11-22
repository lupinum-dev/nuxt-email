<script setup lang="ts">
defineOptions({ name: 'LargeEmail' })

defineProps<{
  payload: string
  rows: number
}>()
</script>

<template>
  <EEmail
    subject="Large email"
    lang="en"
    class="bg-white"
  >
    <ESection
      v-for="index in rows"
      :key="index"
      class="px-6 py-2"
      :data-row="index - 1"
    >
      <EText class="text-sm text-slate-700 sm:text-base">
        Row {{ index }}: {{ payload }}
        <a
          class="text-blue-600 underline"
          :href="`https://example.com/items/${index}?source=email&mode=large`"
        >Open item {{ index }}</a>
      </EText>
    </ESection>
  </EEmail>
</template>
