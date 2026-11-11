<script setup lang="ts">
import {
  AuthError,
  AuthGoogleButton,
  AuthLoading,
  AuthLog,
  AuthLoginButton,
  toSafePath,
  useAuthContext,
} from '@shilp.dev/vue-google-auth'

const route = useRoute()
const context = useAuthContext()
const { public: config } = useRuntimeConfig()

// Page to open after logging in, set by the page that sent the visitor here
const returnTo = computed(() => toSafePath(route.query.redirect))

// Someone who is already logged in (or logs in from another tab) has no reason to stay here
watch(
  () => context.status,
  (status) => {
    if (status === 'authenticated') navigateTo(returnTo.value, { replace: true })
  },
  { immediate: true },
)
</script>

<template>
  <main>
    <h1>Sign in</h1>
    <p class="muted">Directus: {{ config.directusUrl }}</p>

    <AuthError v-slot="{ error, dismiss }">
      <p class="error">
        Error: {{ error }}
        <button class="link" @click="dismiss">Dismiss</button>
      </p>
    </AuthError>

    <AuthLoading>
      <p class="muted">Signing you in...</p>
    </AuthLoading>

    <section class="card">
      <h2>Flow A: redirect</h2>
      <p class="muted">Goes to Directus, then Google, then back with a one time code.</p>
      <AuthLoginButton
        v-slot="{ login, isPending }"
        :start-url="`${config.directusUrl}/shilp/google-auth/start`"
        :return-to="returnTo"
      >
        <button class="primary" :disabled="isPending" @click="login">Login with Google</button>
      </AuthLoginButton>
    </section>

    <section class="card">
      <h2>Flow B: Google button</h2>
      <p class="muted">Google returns an ID token in the browser, which Directus trades for tokens.</p>
      <AuthGoogleButton :client-id="config.googleClientId" @success="navigateTo(returnTo)">
        <template #not-configured>
          <p class="muted">Set NUXT_PUBLIC_GOOGLE_CLIENT_ID to try this flow.</p>
        </template>
      </AuthGoogleButton>
    </section>

    <section class="card">
      <h2>Log</h2>
      <AuthLog v-slot="{ logs }">
        <p v-if="logs.length === 0" class="muted">Nothing yet.</p>
        <ul v-else>
          <li v-for="(entry, index) in logs" :key="index">
            <span class="muted">{{ entry.time }}</span> {{ entry.message }}
          </li>
        </ul>
      </AuthLog>
    </section>
  </main>
</template>
