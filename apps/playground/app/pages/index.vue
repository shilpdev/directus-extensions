<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()

async function onLogout() {
  await logout()
  await navigateTo('/login')
}
</script>

<template>
  <main>
    <h1>Google Auth playground</h1>

    <section v-if="user" class="card">
      <h2>Signed in</h2>
      <dl>
        <dt>Email</dt>
        <dd>{{ user.email }}</dd>
        <dt>Name</dt>
        <dd>{{ [user.first_name, user.last_name].filter(Boolean).join(' ') || '-' }}</dd>
        <dt>Role</dt>
        <dd>{{ user.role?.name ?? '-' }}</dd>
      </dl>
      <button @click="onLogout">Log out</button>
    </section>
  </main>
</template>
