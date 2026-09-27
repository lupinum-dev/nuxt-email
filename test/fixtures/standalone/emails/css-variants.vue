<script setup lang="ts">
defineProps<{ variant: string }>()
</script>

<template>
  <EHtml lang="en">
    <ETailwind>
      <EHead />
      <EBody>
        <EText :class="variant">
          <span>Child content</span>
        </EText>
      </EBody>
    </ETailwind>
  </EHtml>
</template>
