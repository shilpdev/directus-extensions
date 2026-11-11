<template>
  <div v-if="context.status === 'authenticated'" class="auth__logout-button">
    <slot v-bind="scope">
      <button type="button" :disabled="isPending" @click="logout">Log out</button>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAuthContext } from '../composables/use-auth-context'

defineOptions({
  name: 'AuthLogoutButton',
})

const context = useAuthContext()

const isPending = ref(false)

async function logout() {
  isPending.value = true

  try {
    // Local state is cleared even if the backend cannot be reached
    await context.adapter?.logout?.().catch(() => {})
  } finally {
    context.endSession()
    isPending.value = false
  }
}

const scope = computed(() => {
  return { context, logout, isPending: isPending.value }
})
</script>
