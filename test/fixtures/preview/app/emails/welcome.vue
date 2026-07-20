<script setup lang="ts">
defineOptions({ name: 'EmailWelcome' })

defineProps<{
  firstName: string
}>()
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>Preview welcome</title>
    </EHead>
    <EBody>
      <EPreview>Welcome from the preview fixture.</EPreview>
      <EContainer>
        <EHeading>Welcome, {{ firstName }}</EHeading>
        <EText>PREVIEW_VERSION_ONE</EText>
      </EContainer>
    </EBody>
  </EHtml>
</template>
