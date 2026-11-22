import { authentication, createDirectus, rest } from '@directus/sdk'

// The Directus client, available as `useNuxtApp().$directus`
export default defineNuxtPlugin(() => {
  const { public: config } = useRuntimeConfig()

  /*
   * The login is Directus' session cookie, set by the @shilp.dev/directus-google-auth extension.
   * `credentials: 'include'` makes the browser send it to Directus on every request, so no token
   * ever reaches JavaScript.
   */
  const directus = createDirectus(config.directusUrl)
    .with(authentication('session', { credentials: 'include' }))
    .with(rest({ credentials: 'include' }))

  return { provide: { directus } }
})
