<template>
  <slot v-bind="{ context }" />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { RETURN_TO_KEY } from '../constants'
import { useAuthContext } from '../composables/use-auth-context'
import { toSafePath } from '../utils'

defineOptions({
  name: 'AuthCallback',
})

/*
 * Place this on the page the backend sends the browser back to. It draws nothing itself. On mount
 * it reads Google's standard `?error=` from the URL and takes it out of the URL.
 * Without an error the backend has already set the session cookie, so there is nothing to
 * exchange: the login finishes by loading the user, which proves the cookie works.
 * On success it emits the page the user was on before logging in (kept by <AuthLoginButton>).
 */
const { returnToKey = RETURN_TO_KEY } = defineProps<{
  // sessionStorage key where <AuthLoginButton> kept the page to open after login
  returnToKey?: string
}>()

const emit = defineEmits<{
  success: [returnTo: string]
  failure: []
}>()

const context = useAuthContext()

onMounted(async () => {
  const url = new URL(window.location.href)
  const errorCode = url.searchParams.get('error')

  // Take the error out of the URL so a reload doesn't show it again.
  // The current history state is kept, because routers store their position in it.
  url.searchParams.delete('error')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)

  if (errorCode) {
    context.error = errorCode
    context.log(`Callback returned ?error=${errorCode}`)
    emit('failure')
    return
  }

  context.log('Callback returned, session cookie is set')

  // Nothing to exchange, the session cookie is already there
  const isLoggedIn = await context.startSession(async () => {})

  if (!isLoggedIn) {
    emit('failure')
    return
  }

  const returnTo = toSafePath(sessionStorage.getItem(returnToKey))
  sessionStorage.removeItem(returnToKey)
  emit('success', returnTo)
})
</script>
