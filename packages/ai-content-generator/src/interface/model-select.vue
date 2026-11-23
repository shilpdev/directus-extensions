<template>
  <v-notice v-if="error" type="danger">{{ error }}</v-notice>
  <v-notice v-else-if="info && info.models.length === 0" type="warning">
    No models allowed. Add a comma separated list of model IDs to
    <code>{{ info.models_env_key }}</code> in the env file and restart Directus.
  </v-notice>
  <template v-else>
    <v-select
      :model-value="value"
      :items="items"
      :disabled="disabled || loading"
      :placeholder="placeholder"
      show-deselect
      @update:model-value="$emit('input', $event)"
    />
    <v-notice v-if="notAllowed" type="warning" class="notice">
      "{{ value }}" is not in <code>{{ info?.models_env_key }}</code>. The flow will fail until you pick an allowed model.
    </v-notice>
  </template>
</template>

<script setup lang="ts">
import { useApi } from '@directus/extensions-sdk'
import { computed, ref, watch } from 'vue'
import { EXTENSION_ID } from '../providers/meta'

interface ModelsResponse {
  provider: string
  models: string[]
  models_env_key: string
  token_configured: boolean
  token_env_key: string
}

const props = withDefaults(
  defineProps<{
    value: string | null
    disabled?: boolean
    provider?: string
  }>(),
  { disabled: false, provider: 'claude' },
)

defineEmits<{ input: [value: string | null] }>()

const api = useApi()
const info = ref<ModelsResponse | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const notAllowed = computed(() => !!props.value && !!info.value && !info.value.models.includes(props.value))

const items = computed(() => {
  const models = info.value?.models ?? []
  const list = models.map((model) => ({ text: model, value: model }))
  if (notAllowed.value && props.value) list.push({ text: `${props.value} (not allowed)`, value: props.value })
  return list
})

const placeholder = computed(() => {
  if (loading.value) return 'Loading models…'
  const first = info.value?.models[0]
  return first ? `Default: ${first}` : 'Select a model'
})

async function load(provider: string) {
  loading.value = true
  error.value = null
  try {
    const response = await api.get(`/${EXTENSION_ID}/models/${encodeURIComponent(provider)}`)
    info.value = response.data.data
  } catch (err) {
    const message = (err as { response?: { data?: { errors?: { message?: string }[] } } }).response?.data?.errors?.[0]?.message
    error.value = message ?? 'Could not load the allowed models.'
  } finally {
    loading.value = false
  }
}

watch(() => props.provider, (provider) => load(provider), { immediate: true })
</script>

<style scoped>
.notice {
  margin-top: 8px;
}
</style>
