<template>
  <div v-if="context.status !== 'authenticated'" class="auth__google-button">
    <div v-show="clientId" ref="target" />
    <slot v-if="!clientId" name="not-configured" v-bind="{ context }">
      <p>Set a client id to show the Google button.</p>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthContext } from '../composables/use-auth-context'

defineOptions({
  name: 'AuthGoogleButton',
})

// Google Identity Services flow. Google draws its button into the div above and returns an ID token.
const {
  clientId = '',
  theme = 'outline',
  size = 'large',
  text = 'signin_with',
  shape = 'rectangular',
} = defineProps<{
  // Google OAuth client id. Without it nothing is drawn.
  clientId?: string
  theme?: 'outline' | 'filled_blue' | 'filled_black'
  size?: 'large' | 'medium' | 'small'
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
  shape?: 'rectangular' | 'pill'
}>()

const emit = defineEmits<{
  success: []
}>()

const context = useAuthContext()

const target = ref<HTMLElement | null>(null)

function loadScript(): Promise<void> {
  const scriptUrl = 'https://accounts.google.com/gsi/client'

  if ((window as any).google?.accounts) return Promise.resolve()

  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`)
    const script = existing ?? document.createElement('script')
    script.addEventListener('load', () => resolve())

    if (!existing) {
      script.src = scriptUrl
      script.async = true
      document.head.appendChild(script)
    }
  })
}

async function onCredential(credential: string) {
  context.log('Google returned a credential')

  const isLoggedIn = await context.startSession(async () => {
    if (!context.adapter?.exchangeCredential) throw new Error('adapter.exchangeCredential is not defined')
    await context.adapter.exchangeCredential(credential)
  })

  if (isLoggedIn) emit('success')
}

onMounted(async () => {
  if (!clientId) return

  await loadScript()

  const google = (window as any).google
  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: { credential: string }) => onCredential(response.credential),
  })
  google.accounts.id.renderButton(target.value, { theme, size, text, shape })
})
</script>
