<template>
  <div v-if="context.error" class="auth__error">
    <slot v-bind="scope">
      <p>{{ context.error }}</p>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthContext } from '../composables/use-auth-context'
defineOptions({
  name: 'AuthError',
})

const context = useAuthContext()

const scope = computed(() => {
  return { context, error: context.error!, dismiss: context.clearError }
})
</script>
