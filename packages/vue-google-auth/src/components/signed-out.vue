<template>
  <div v-if="context.status === 'anonymous'" class="auth__signed-out">
    <slot v-bind="{ context }" />
  </div>
</template>

<script setup lang="ts">
import { useAuthContext } from '../composables/use-auth-context'
defineOptions({
  name: 'AuthSignedOut',
})

const context = useAuthContext()
</script>
