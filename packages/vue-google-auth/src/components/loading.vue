<template>
  <div v-if="context.status === 'loading'" class="auth__loading">
    <slot v-bind="{ context }">
      <p>Loading...</p>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { useAuthContext } from '../composables/use-auth-context'
defineOptions({
  name: 'AuthLoading',
})

const context = useAuthContext()
</script>
