<script setup lang="ts">
// Google Identity Services draws its button into the div below and returns an ID token
const { clientId } = defineProps<{
  clientId: string
}>()

const emit = defineEmits<{
  credential: [credential: string]
}>()

const target = useTemplateRef('target')

function loadScript(): Promise<void> {
  if ((window as any).google?.accounts) return Promise.resolve()

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.addEventListener('load', () => resolve())
    document.head.appendChild(script)
  })
}

onMounted(async () => {
  await loadScript()

  const { google } = window as any

  google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: { credential: string }) => emit('credential', response.credential),
  })
  google.accounts.id.renderButton(target.value, { theme: 'outline', size: 'large' })
})
</script>

<template>
  <div ref="target" />
</template>
