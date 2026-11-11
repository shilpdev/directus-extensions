<script setup lang="ts">
import { AuthCallback } from '@shilp.dev/vue-google-auth'

// The backend sends the browser here after Google, with ?code=... or ?error=...
</script>

<template>
  <main>
    <AuthCallback
      @success="(returnTo) => navigateTo(returnTo, { replace: true })"
      @failure="navigateTo('/login', { replace: true })"
    >
      <p class="muted">Signing you in...</p>
    </AuthCallback>
  </main>
</template>
