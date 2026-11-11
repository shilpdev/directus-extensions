<template>
  <div class="auth">
    <slot v-bind="context" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, reactive, ref } from 'vue'
import { AUTH_CONTEXT_KEY, CHANNEL_NAME } from '../constants'
import type { AuthAdapter, AuthContext, AuthLogEntry, AuthStatus, AuthUserData } from '../types'

defineOptions({
  name: 'Auth',
})

const { adapter } = defineProps<{
  // How the components talk to your backend
  adapter: AuthAdapter
}>()

const status = ref<AuthStatus>('loading')
const user = ref<AuthUserData | null>(null)
const error = ref<string | null>(null)
const logs = ref<AuthLogEntry[]>([])

const isAuthenticated = computed(() => status.value === 'authenticated')

let channel: BroadcastChannel | null = null

// A login is running. Children mount before this root, so the callback starts one before onMounted.
let isStarting = false

function log(message: string) {
  logs.value.unshift({ time: new Date().toLocaleTimeString(), message })
}

function clearError() {
  error.value = null
}

async function restoreSession() {
  if (isStarting) return

  status.value = 'loading'

  try {
    user.value = await adapter.getUser()
  } catch {
    user.value = null
  }

  status.value = user.value ? 'authenticated' : 'anonymous'
}

/*
 * Shared by the callback and the Google button, so it lives here. Resolves false when the login
 * fails, with the reason in `error`.
 */
async function startSession(exchange: () => Promise<void>) {
  isStarting = true
  error.value = null
  status.value = 'loading'

  try {
    await exchange()

    const signedInUser = await adapter.getUser()
    if (!signedInUser) throw new Error('Could not start the session')

    user.value = signedInUser
    status.value = 'authenticated'
    channel?.postMessage('login')
    return true
  } catch (caught) {
    user.value = null
    status.value = 'anonymous'
    error.value = caught instanceof Error ? caught.message : 'Unexpected error'
    log(`Sign in failed: ${error.value}`)
    return false
  } finally {
    isStarting = false
  }
}

function expireSession() {
  user.value = null
  status.value = 'anonymous'
}

function endSession() {
  expireSession()
  channel?.postMessage('logout')
}

const context = reactive({
  adapter,
  status,
  isAuthenticated,
  user,
  error,
  logs,
  log,
  clearError,
  restoreSession,
  startSession,
  expireSession,
  endSession,
}) as AuthContext

provide(AUTH_CONTEXT_KEY, context)

adapter.connect?.({ log, expire: expireSession })

onMounted(() => {
  // Log in or out in one tab and the others follow
  if (typeof BroadcastChannel !== 'undefined') {
    channel = new BroadcastChannel(CHANNEL_NAME)
    channel.onmessage = (event) => {
      if (event.data === 'logout') expireSession()
      if (event.data === 'login' && status.value !== 'authenticated') void restoreSession()
    }
  }

  void restoreSession()
})

onUnmounted(() => {
  channel?.close()
  channel = null
})
</script>
