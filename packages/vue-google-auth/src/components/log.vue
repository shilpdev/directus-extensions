<template>
  <div class="auth__log">
    <slot v-bind="scope">
      <ul>
        <li v-for="(entry, index) in context.logs" :key="index">{{ entry.time }} {{ entry.message }}</li>
      </ul>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuthContext } from '../composables/use-auth-context'
defineOptions({
  name: 'AuthLog',
})

const context = useAuthContext()

const scope = computed(() => {
  return { context, logs: context.logs }
})
</script>
