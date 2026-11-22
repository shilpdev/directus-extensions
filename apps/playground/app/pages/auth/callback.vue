<script setup lang="ts">
import { RETURN_TO_KEY } from '~/constants'

/*
 * The extension's /callback sends the browser here after Google. On success the session cookie is
 * already set, so there is nothing to exchange: loading the user proves it works.
 * On failure the URL has ?error=<CODE>.
 */
const route = useRoute()
const { fetchUser } = useAuth()

onMounted(async () => {
  if (route.query.error) {
    return navigateTo({ path: '/login', query: { error: String(route.query.error) } }, { replace: true })
  }

  if (!(await fetchUser())) {
    return navigateTo({ path: '/login', query: { error: 'SESSION_NOT_STARTED' } }, { replace: true })
  }

  const returnTo = sessionStorage.getItem(RETURN_TO_KEY) ?? '/'
  sessionStorage.removeItem(RETURN_TO_KEY)

  await navigateTo(returnTo, { replace: true })
})
</script>

<template>
  <main>
    <p class="muted">Signing you in...</p>
  </main>
</template>
