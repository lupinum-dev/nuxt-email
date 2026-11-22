<script setup lang="ts">
defineProps<{
  code: string
  expiresInMinutes: number
  optionalNote?: string
}>()
</script>

<template>
  <EEmail
    subject="Reset your password"
    :preview="`Your password reset code is ${code}.`"
    lang="en"
  >
    <template #head>
      <title>Reset your password</title>
    </template>
    <EContainer>
      <EHeading>Reset your password</EHeading>
      <EText>
        Use code {{ code }} within {{ expiresInMinutes }} minutes.
      </EText>
      <EText v-if="optionalNote">
        {{ optionalNote }}
      </EText>
    </EContainer>
  </EEmail>
</template>
