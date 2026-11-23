import { claudeProvider } from './claude'
import { geminiProvider } from './gemini'
import type { ProviderId } from './meta'
import type { AiProvider } from './types'

export const providers: Record<ProviderId, AiProvider> = {
  claude: claudeProvider,
  gemini: geminiProvider,
}
