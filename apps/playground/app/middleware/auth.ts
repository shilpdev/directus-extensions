// Pages that need a signed in user. Visitors are sent to /login and returned afterwards.
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, isChecked, fetchUser } = useAuth()

  if (!isChecked.value) await fetchUser()

  if (!user.value) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
