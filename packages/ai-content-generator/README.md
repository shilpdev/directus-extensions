# @shilp.dev/directus-ai-content-generator

A Directus extension bundle with a **flow operation** that writes content with AI: descriptions, summaries, SEO copy, anything you can describe in a prompt. You give it a set of variables and a prompt that uses them, and it returns the generated text (or JSON) to the next step of the flow.

Supported providers: **Claude** (Anthropic) and **Gemini** (Google). The code is split per provider so ChatGPT and others can be added later.

## Requirements

- Directus 11 or newer.
- An API key for at least one provider (Claude or Gemini).

## Install

In your Directus project:

```bash
npm install @shilp.dev/directus-ai-content-generator
```

Then set the environment variables below and restart Directus. With Docker, add the package to your image (e.g. `RUN pnpm install @shilp.dev/directus-ai-content-generator` in a Dockerfile based on `directus/directus`).

To install it by hand, copy `package.json` and the built `dist` folder to `extensions/directus-ai-content-generator` and restart Directus.

This bundle has a server-side part (it calls the AI APIs), so it isn't sandboxed. The Directus Marketplace only lists such extensions when `MARKETPLACE_TRUST=all` is set; installing from npm works either way.

## Configuration

Each provider's API key and allowed models are environment variables of the Directus instance, never part of the flow itself. Restart Directus after changing them.

| Variable | Description |
| --- | --- |
| `SHILP_AI_CONTENT_GENERATOR_CLAUDE_TOKEN` | Claude API key from https://platform.claude.com. |
| `SHILP_AI_CONTENT_GENERATOR_CLAUDE_MODELS` | Comma separated model IDs that flows may use, passed to the API as is. The first one is the default. Example: `claude-opus-5-5,claude-sonnet-5-5,claude-haiku-5-5` |
| `SHILP_AI_CONTENT_GENERATOR_GEMINI_TOKEN` | Gemini API key from https://aistudio.google.com/apikey. |
| `SHILP_AI_CONTENT_GENERATOR_GEMINI_MODELS` | Same as above for Gemini. Example: `gemini-3.8-flash` |

You only need the variables of the providers you use.

Only the models in the list show up in the Model dropdown, and a flow that asks for any other model fails with `MODEL_NOT_ALLOWED`. When a new model comes out, add it to the list; when you remove one, flows still using it fail until you pick another model.

## Options

| Option | Description |
| --- | --- |
| AI Provider | `Claude` or `Gemini`. |
| Variables | JSON object of key/value pairs. Values can use Directus flow data, e.g. `"title": "{{ $last.title }}"`. |
| Prompt | The instruction. Use variables with **single braces**: `{title}`, nested `{movie.year}`. |
| System Prompt | Optional. Tone, brand voice, rules. Supports `{variables}` too. |
| Model | One of the models in the provider's `*_MODELS` variable. Empty = the first one. |
| Max Tokens | Upper limit of the output, default `4096`. For Gemini, thinking tokens count toward it too. |
| Effort | Claude only. `low` / `medium` (default) / `high` / `xhigh` / `max`. Higher is better on hard tasks but slower and uses more tokens. |
| Thinking Level | Gemini only. `minimal` / `low` / `medium` / `high`. Empty = model default. Not every model supports every level (e.g. `gemini-3.8-flash` rejects `minimal`). |
| Temperature | Gemini only. `0` to `2`. Lower = more focused, higher = more creative. Empty = model default. |
| Top P | Gemini only. `0` to `1`. Empty = model default. |
| Top K | Gemini only. Empty = model default. |
| Output Format | `Text`, or `JSON` that is guaranteed to match the JSON Schema you give. |

Why single braces? Directus replaces `{{ ... }}` in operation options with flow data before the operation runs, so `{{ }}` is for flow data and `{ }` is for this operation's variables. Text that isn't a plain name, like `{"a": 1}`, is left as is.

If the prompt uses a variable that is missing or empty, the operation fails with `MISSING_VARIABLES` instead of sending an incomplete prompt. Empty means `""`, `null`, or flow data Directus couldn't find: Directus turns `{{ $last.year }}` into the text `"undefined"` when there is no year, and that counts as missing too.

For the other options, a blank value (including `"undefined"` from flow data) means "not set": Model falls back to the first allowed model, Max Tokens to `4096`, and provider options like Temperature to the model default.

## Output

The operation returns this object, available to the next step as `$last`:

```json
{
  "text": "Generated text…",
  "json": null,
  "provider": "claude",
  "model": "claude-opus-5-5",
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 85, "output_tokens": 160 }
}
```

With Output Format `JSON`, `json` holds the parsed object and `text` the raw JSON string.

If the AI declines the request, the operation fails with `PROVIDER_REFUSAL`: Claude when it refuses for safety reasons, Gemini when it blocks the prompt or the output (safety, recitation, prohibited content).

## Example: generate a movie description

1. **Trigger:** Manual, collection `movies`, location "Item page".
2. **Read Data:** collection `movies`, IDs `{{ $trigger.body.keys }}`.
3. **AI Content Generator:**
   - Variables
     ```json
     {
       "title": "{{ $last[0].title }}",
       "year": "{{ $last[0].year }}",
       "genres": "{{ $last[0].genres }}"
     }
     ```
   - Prompt
     ```
     Write a 120 word description for the movie {title} ({year}).
     Genres: {genres}. Don't reveal the ending. Reply with the description only.
     ```
4. **Update Data:** collection `movies`, IDs `{{ $trigger.body.keys }}`, payload `{ "description": "{{ $last.text }}" }`.

Open a movie, click the flow button in the sidebar, and the description is filled in.

## Errors

Errors fail the flow and show in the flow logs as `[CODE] message`.

| Code | Meaning |
| --- | --- |
| `NOT_CONFIGURED` | The provider's token or models env variable is not set. |
| `MODEL_NOT_ALLOWED` | The selected model is not in the provider's models env variable. |
| `INVALID_OPTION` | Missing prompt, invalid Variables / JSON Schema, bad Max Tokens. |
| `MISSING_VARIABLES` | The prompt uses a `{variable}` that is missing or empty, often because the flow data it reads doesn't exist. |
| `PROVIDER_AUTH` | The provider rejected the token. |
| `PROVIDER_MODEL` | The model ID does not exist. |
| `PROVIDER_RATE_LIMIT` | Too many requests, try again later. |
| `PROVIDER_BAD_REQUEST` / `PROVIDER_ERROR` | Other errors from the provider API. |
| `PROVIDER_REFUSAL` | The AI declined to generate the content. |
| `OUTPUT_TRUNCATED` / `INVALID_JSON` | JSON output was cut off by Max Tokens or could not be parsed. |

## What's in the bundle

| Entry | Purpose |
| --- | --- |
| Operation `shilp-ai-content-generator` | The flow operation. |
| Endpoint `GET /shilp-ai-content-generator/models/:provider` | Returns the allowed models and whether a token is set (never the token itself). Signed in users only. Used by the Model dropdown. |
| Interface `shilp-ai-content-generator-model-select` | The Model dropdown. Hidden from the regular field interface picker. |

The options form runs in the browser and can't read server env variables, which is why the model list comes through the endpoint.

## Adding a provider

1. Add its metadata (label, token and models env variables) to `PROVIDERS` in `src/providers/meta.ts`.
2. Implement the `AiProvider` interface from `src/providers/types.ts` in `src/providers/<name>.ts`.
3. Register it in `src/providers/index.ts`.

Provider-only options go in `src/operation/app.ts`, named `<provider>_<option>` (like `claude_effort`, `gemini_temperature`) and shown only when that provider is selected. The handler passes every `<provider>_*` option to that provider as `providerOptions`, with the prefix removed (`providerOptions.temperature`).

## Development

```bash
pnpm dev     # build in watch mode
pnpm build
```
