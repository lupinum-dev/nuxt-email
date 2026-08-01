<template>
  <ECodeBlock
    code="const valid = true"
    language="typescript"
  />
  <!-- @vue-expect-error "python" is not in this fixture's configured language allowlist -->
  <ECodeBlock
    code="valid = True"
    language="python"
  />
</template>
