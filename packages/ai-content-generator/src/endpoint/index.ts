import { defineEndpoint } from '@directus/extensions-sdk'
import { getAllowedModels, getToken } from '../lib/env'
import { EXTENSION_ID, PROVIDERS, isProviderId } from '../providers/meta'

// GET /shilp-ai-content-generator/models/:provider
// Lists the models allowed in the env file, for the model dropdown of the
// flow operation. Never returns the token, only whether one is set.
export default defineEndpoint({
  id: EXTENSION_ID,
  handler: (router, { env }) => {
    router.get('/models/:provider', (req, res) => {
      const accountability = (req as unknown as { accountability?: { user?: string | null } }).accountability
      if (!accountability?.user) {
        res.status(401).json({ errors: [{ message: 'You must be signed in.', extensions: { code: 'UNAUTHORIZED' } }] })
        return
      }

      const provider = req.params.provider
      if (!isProviderId(provider)) {
        res.status(404).json({ errors: [{ message: `Unknown AI provider "${provider}".`, extensions: { code: 'NOT_FOUND' } }] })
        return
      }

      const meta = PROVIDERS[provider]
      res.json({
        data: {
          provider,
          models: getAllowedModels(env, meta),
          models_env_key: meta.modelsEnvKey,
          token_configured: getToken(env, meta) !== undefined,
          token_env_key: meta.tokenEnvKey,
        },
      })
    })
  },
})
