<template>
  <div v-if="context.status === 'authenticated' && context.user" class="auth__user">
    <slot v-bind="scope">
      <pre>{{ JSON.stringify(context.user, null, 2) }}</pre>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthContext } from '../composables/use-auth-context'

defineOptions({
  name: 'AuthUser',
})

const context = useAuthContext()

const scope = computed(() => {
  return { context, user: context.user! }
})
</script>
