import { defineInterface } from '@directus/extensions-sdk'
import { MODEL_INTERFACE_ID } from '../providers/meta'
import ModelSelect from './model-select.vue'

// Used only by the operation's Model option, so it is hidden from the
// interface picker of regular fields (system: true).
export default defineInterface({
  id: MODEL_INTERFACE_ID,
  name: 'AI Model',
  icon: 'smart_toy',
  description: 'Select one of the AI models allowed in the env file.',
  component: ModelSelect,
  options: null,
  types: ['string'],
  system: true,
})
