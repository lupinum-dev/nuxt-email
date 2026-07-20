<script setup lang="ts">
defineProps<{
  code: string
  expiresInMinutes: number
  optionalNote?: string
}>()
</script>

<template>
  <EHtml lang="en">
    <EHead>
      <title>Reset your password</title>
    </EHead>
    <EBody>
      <EPreview>Your password reset code is {{ code }}.</EPreview>
      <EContainer>
        <EHeading>Reset your password</EHeading>
        <EText>
          Use code {{ code }} within {{ expiresInMinutes }} minutes.
        </EText>
        <EText v-if="optionalNote">
          {{ optionalNote }}
        </EText>
      </EContainer>
    </EBody>
  </EHtml>
</template>
