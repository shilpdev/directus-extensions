<script setup lang="ts">
import { customEndpoint } from '@directus/sdk'
import { RETURN_TO_KEY } from '~/constants'

definePageMeta({ middleware: 'guest' })

const route = useRoute()
const { $directus } = useNuxtApp()
const { fetchUser } = useAuth()
const { public: config } = useRuntimeConfig()

const error = ref(route.query.error ? String(route.query.error) : null)

// Page to open after logging in, set by the page that sent the visitor here
const returnTo = computed(() => toSafePath(route.query.redirect))

// Flow A: the browser goes to Directus, then Google, then back to /auth/callback with the cookie set
function loginWithRedirect() {
  sessionStorage.setItem(RETURN_TO_KEY, returnTo.value)

  const callbackUrl = `${window.location.origin}/auth/callback`
  window.location.href = `${config.directusUrl}/shilp/google-auth/start?redirect_uri=${encodeURIComponent(callbackUrl)}`
}

// Flow B: Google returns an ID token in the browser, Directus trades it for the session cookie
async function loginWithCredential(credential: string) {
  error.value = null

  try {
    await $directus.request(
      customEndpoint({
        path: '/shilp/google-auth/token',
        method: 'POST',
        body: JSON.stringify({ credential }),
        headers: { 'Content-Type': 'application/json' },
      }),
    )
  } catch (caught: any) {
    error.value = caught?.errors?.[0]?.message ?? 'Could not sign in'
    return
  }

  if (await fetchUser()) await navigateTo(returnTo.value)
  else error.value = 'Could not start the session'
}
</script>

<template>
  <main>
    <h1>Sign in</h1>
    <p class="muted">Directus: {{ config.directusUrl }}</p>

    <p v-if="error" class="error">Error: {{ error }}</p>

    <section class="card">
      <h2>Flow A: redirect</h2>
      <p class="muted">Goes to Directus, then Google, then back with the session cookie set.</p>
      <button class="primary" @click="loginWithRedirect">Login with Google</button>
    </section>

    <section class="card">
      <h2>Flow B: Google button</h2>
      <p class="muted">Google returns an ID token in the browser, which Directus trades for the session cookie.</p>
      <GoogleButton v-if="config.googleClientId" :client-id="config.googleClientId" @credential="loginWithCredential" />
      <p v-else class="muted">Set NUXT_PUBLIC_GOOGLE_CLIENT_ID to try this flow.</p>
    </section>
  </main>
</template>
