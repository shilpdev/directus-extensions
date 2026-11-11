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
 * it reads Google's standard `?code=` or `?error=` from the URL, takes it out of the URL, and
 * finishes the login.
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
  const code = url.searchParams.get('code')
  const errorCode = url.searchParams.get('error')

  // The code works once: take it out of the URL before anything else, so a reload can't reuse it.
  // The current history state is kept, because routers store their position in it.
  url.searchParams.delete('code')
  url.searchParams.delete('error')
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)

  if (errorCode || !code) {
    context.error = errorCode ? String(errorCode) : 'Missing code'
    context.log(`Callback returned ${errorCode ? `?error=${errorCode}` : 'no code'}`)
    emit('failure')
    return
  }

  context.log('Callback returned ?code=...')

  const isLoggedIn = await context.startSession(async () => {
    if (!context.adapter?.exchangeCode) throw new Error('adapter.exchangeCode is not defined')
    await context.adapter.exchangeCode(String(code))
  })

  if (!isLoggedIn) {
    emit('failure')
    return
  }

  const returnTo = toSafePath(sessionStorage.getItem(returnToKey))
  sessionStorage.removeItem(returnToKey)
  emit('success', returnTo)
})
</script>
