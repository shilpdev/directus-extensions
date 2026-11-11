<script setup lang="ts">
import {
  AuthLoading,
  AuthLog,
  AuthLogoutButton,
  AuthSignedIn,
  AuthUser,
  useAuthContext,
} from '@shilp.dev/vue-google-auth'

const route = useRoute()
const context = useAuthContext()
const { accessToken } = useDirectusSession()

// Only logged in users stay here. A visitor (or a session that ended) is sent to /login and
// returned afterwards.
watch(
  () => context.status,
  (status) => {
    if (status === 'anonymous') {
      navigateTo({ path: '/login', query: { redirect: route.fullPath } }, { replace: true })
    }
  },
  { immediate: true },
)
</script>

<template>
  <main>
    <h1>Google Auth playground</h1>

    <AuthLoading>
      <p class="muted">Checking your session...</p>
    </AuthLoading>

    <AuthSignedIn>
      <section class="card">
        <h2>Signed in</h2>
        <AuthUser v-slot="{ user }">
          <dl>
            <dt>Email</dt>
            <dd>{{ user.email }}</dd>
            <dt>Name</dt>
            <dd>{{ [user.first_name, user.last_name].filter(Boolean).join(' ') || '-' }}</dd>
            <dt>Role</dt>
            <dd>{{ user.role?.name ?? '-' }}</dd>
            <dt>Access token</dt>
            <dd class="token">{{ accessToken }}</dd>
          </dl>
        </AuthUser>
        <AuthLogoutButton v-slot="{ logout, isPending }">
          <button :disabled="isPending" @click="logout">Log out</button>
        </AuthLogoutButton>
      </section>
    </AuthSignedIn>

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
