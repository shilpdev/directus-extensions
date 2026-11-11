// The adapter that connects the auth components to Directus. <Auth> in app.vue receives it.
export default defineNuxtPlugin(() => {
  const { public: config } = useRuntimeConfig()

  return { provide: { authAdapter: createDirectusAdapter({ directusUrl: config.directusUrl }) } }
})
