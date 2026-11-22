// Pages for visitors only, like /login. Someone who is already signed in has no reason to stay.
export default defineNuxtRouteMiddleware(async () => {
  const { user, isChecked, fetchUser } = useAuth()

  if (!isChecked.value) await fetchUser()

  if (user.value) return navigateTo('/')
})
