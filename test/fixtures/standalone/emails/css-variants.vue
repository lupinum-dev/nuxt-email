<script setup lang="ts">
defineProps<{ variant: string }>()
</script>

<template>
  <EEmail
    subject="CSS variants"
    lang="en"
  >
    <!-- Classes must appear complete in source: *:bg-red-500 **:text-blue-500 sm:bg-red-500 -->
    <EText :class="variant">
      <span>Child content</span>
    </EText>
  </EEmail>
</template>
