export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',
  devtools: { enabled: false },
  // The session lives in a cookie on the Directus domain, so the app only runs in the browser
  ssr: false,
  runtimeConfig: {
    public: {
      // Override with NUXT_PUBLIC_DIRECTUS_URL / NUXT_PUBLIC_GOOGLE_CLIENT_ID
      directusUrl: 'http://localhost:8055',
      googleClientId: '',
    },
  },
})
