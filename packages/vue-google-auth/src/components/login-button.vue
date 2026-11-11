<template>
  <div v-if="context.status !== 'authenticated'" class="auth__login-button">
    <slot v-bind="scope">
      <button type="button" :disabled="scope.isPending" @click="scope.login">Login with Google</button>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RETURN_TO_KEY } from '../constants'
import { useAuthContext } from '../composables/use-auth-context'

defineOptions({
  name: 'AuthLoginButton',
})

/*
 * Redirect flow. The browser goes to your backend's start URL with Google's standard
 * `redirect_uri` param, the backend sends it to Google, and Google's answer ends up on
 * `callbackPath`, where <AuthCallback> finishes the login.
 */
const {
  startUrl,
  callbackPath = '/auth/callback',
  returnTo = '/',
  returnToKey = RETURN_TO_KEY,
} = defineProps<{
  // URL that begins the login on your backend
  startUrl: string
  // Page of this app the backend sends the browser back to
  callbackPath?: string
  // Page to open after the login finishes
  returnTo?: string
  // sessionStorage key that remembers `returnTo` while the browser is away
  returnToKey?: string
}>()

const context = useAuthContext()

function login() {
  sessionStorage.setItem(returnToKey, returnTo)
  context.log(`Redirecting to ${startUrl}`)

  const callbackUrl = `${window.location.origin}${callbackPath}`
  window.location.href = `${startUrl}?redirect_uri=${encodeURIComponent(callbackUrl)}`
}

const scope = computed(() => {
  return { context, login, isPending: context.status === 'loading' }
})
</script>
