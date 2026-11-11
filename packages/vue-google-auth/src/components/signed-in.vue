<template>
  <div v-if="context.status === 'authenticated'" class="auth__signed-in">
    <slot v-bind="{ context }" />
  </div>
</template>

<script setup lang="ts">
import { useAuthContext } from '../composables/use-auth-context'
defineOptions({
  name: 'AuthSignedIn',
})

const context = useAuthContext()
</script>
