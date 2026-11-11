<script setup lang="ts">
import { GOOGLE_IDENTITY_SCRIPT_URL, QUERY_CODE, QUERY_ERROR } from '~/constants'

const route = useRoute()
const router = useRouter()
const { public: config } = useRuntimeConfig()
const { tokens, user, error, logs, log, loginWithRedirect, exchangeCode, loginWithCredential, logout } =
  useGoogleAuth()

const googleButton = ref<HTMLElement | null>(null)

// The code works once, so remove it from the URL right away (a reload would otherwise reuse it)
async function handleRedirectResult() {
  const code = route.query[QUERY_CODE]
  const errorCode = route.query[QUERY_ERROR]

  if (!code && !errorCode) return

  await router.replace({ query: {} })

  if (errorCode) {
    error.value = String(errorCode)
    log(`Extension returned ?${QUERY_ERROR}=${errorCode}`)
    return
  }

  log(`Extension returned ?${QUERY_CODE}=...`)
  await exchangeCode(String(code))
}

function renderGoogleButton() {
  if (!config.googleClientId) return

  const script = document.createElement('script')
  script.src = GOOGLE_IDENTITY_SCRIPT_URL
  script.async = true
  script.onload = () => {
    const google = (window as any).google
    google.accounts.id.initialize({
      client_id: config.googleClientId,
      callback: (response: { credential: string }) => loginWithCredential(response.credential),
    })
    google.accounts.id.renderButton(googleButton.value, { theme: 'outline', size: 'large' })
  }
  document.head.appendChild(script)
}

onMounted(() => {
  handleRedirectResult()
  renderGoogleButton()
})
</script>

<template>
  <main>
    <h1>Google Auth playground</h1>
    <p class="muted">Directus: {{ config.directusUrl }}</p>

    <p v-if="error" class="error">Error: {{ error }}</p>

    <section v-if="user">
      <h2>Signed in</h2>
      <dl>
        <dt>Email</dt>
        <dd>{{ user.email }}</dd>
        <dt>Name</dt>
        <dd>{{ [user.first_name, user.last_name].filter(Boolean).join(' ') || '-' }}</dd>
        <dt>Role</dt>
        <dd>{{ user.role?.name ?? '-' }}</dd>
        <dt>Access token</dt>
        <dd class="token">{{ tokens?.access_token }}</dd>
      </dl>
      <button @click="logout">Log out</button>
    </section>

    <section v-else>
      <h2>Flow A: redirect</h2>
      <button @click="loginWithRedirect">Login with Google</button>

      <h2>Flow B: Google button</h2>
      <div v-show="config.googleClientId" ref="googleButton" />
      <p v-if="!config.googleClientId" class="muted">
        Set NUXT_PUBLIC_GOOGLE_CLIENT_ID to try this flow.
      </p>
    </section>

    <section>
      <h2>Log</h2>
      <p v-if="logs.length === 0" class="muted">Nothing yet.</p>
      <ul>
        <li v-for="(entry, index) in logs" :key="index">
          <span class="muted">{{ entry.time }}</span> {{ entry.message }}
        </li>
      </ul>
    </section>
  </main>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #fafafa;
  color: #1a1a1a;
}
main {
  max-width: 640px;
  margin: 0 auto;
  padding: 32px 16px;
}
button {
  padding: 10px 16px;
  border: 1px solid #ccc;
  border-radius: 6px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
}
dt {
  font-weight: 600;
  margin-top: 8px;
}
dd {
  margin: 0;
}
.token {
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
}
.muted {
  color: #777;
}
.error {
  padding: 8px 12px;
  border-radius: 6px;
  background: #fdecea;
  color: #b3261e;
}
ul {
  padding-left: 18px;
  font-size: 13px;
}
</style>
