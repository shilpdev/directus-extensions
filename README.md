# Directus Extensions

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Open-source [Directus](https://directus.io) extensions by [7Span](https://7span.com), published on npm under the `@shilp.dev` scope.

## About

This repository is a pnpm monorepo that holds all of our Directus extensions. Each extension lives in its own folder under [`packages/`](packages), has its own README with setup and configuration details, and is published to npm as a separate package. All extensions target **Directus 11** or newer.

## Extensions

| Extension | Description | Package | npm |
| --- | --- | --- | --- |
| [Google Auth](packages/google-auth) | "Login with Google" for custom frontends. Signs users in (and registers them on first login) as regular Directus users, with session cookie or JWT modes. | `@shilp.dev/directus-google-auth` | [![npm](https://img.shields.io/npm/v/@shilp.dev/directus-google-auth.svg)](https://www.npmjs.com/package/@shilp.dev/directus-google-auth) |
| [AI Content Generator](packages/ai-content-generator) | Flow operation that generates content (descriptions, summaries, copy) with Claude or Gemini from a prompt and a set of variables. | `@shilp.dev/directus-ai-content-generator` | [![npm](https://img.shields.io/npm/v/@shilp.dev/directus-ai-content-generator.svg)](https://www.npmjs.com/package/@shilp.dev/directus-ai-content-generator) |
| [Counter](packages/counter) | Endpoint that atomically increments a numeric field (views, plays, downloads...) of any item, found by its id or any other field. | `@shilp.dev/directus-counter` | [![npm](https://img.shields.io/npm/v/@shilp.dev/directus-counter.svg)](https://www.npmjs.com/package/@shilp.dev/directus-counter) |

## How to Install

Each extension's README lists the environment variables and any extra setup it needs. The install steps are the same for all of them.

### npm

In your Directus project, install the package and restart Directus:

```bash
npm install @shilp.dev/directus-google-auth
```

### Docker

Extend the official image and install the packages you need:

```dockerfile
FROM directus/directus:11

USER root
RUN corepack enable
USER node

RUN pnpm install @shilp.dev/directus-google-auth @shilp.dev/directus-ai-content-generator
```

### Manual

Copy the extension's `package.json` and built `dist/` folder into your Directus `extensions/<extension-name>` folder and restart Directus.

### Marketplace

These extensions run server-side code, so they are not sandboxed. The Directus Marketplace only lists them when `MARKETPLACE_TRUST=all` is set on your instance; installing from npm works either way.

## Development

Contributions are welcome. Below is how to work on the extensions locally, with a single Directus instance running in Docker.

### Layout


```
packages/        one folder per package
  google-auth            Directus endpoint extension (Google login)
  ai-content-generator   Directus bundle: flow operation to generate content with Claude or Gemini
  counter                Directus endpoint extension (increment views and other counters)
apps/playground  Nuxt app that uses directus-google-auth
docker/          local sqlite DB + uploads (gitignored)
docker-compose.yml
```

### Getting started

```bash
pnpm install
pnpm build               # Docker loads the built dist/ of each package
cp .env.example .env     # required: docker-compose.yml reads all settings from .env
pnpm directus:up         # http://localhost:8055  (admin@example.com / admin)
```

### Adding an extension

```bash
cd packages
pnpm create directus-extension@latest
```

Pick a name, type and language. The scaffold lands in `packages/<name>` and must have a `dev` script (`directus-extension build -w`) and a `build` script.

Then run all extensions in watch mode:

```bash
pnpm dev
```

`./packages` is mounted at `/directus/extensions`, and `EXTENSIONS_AUTO_RELOAD` is on, so rebuilt extensions reload in Directus without a restart. If a new extension doesn't show up, run `pnpm directus:restart`.

### Build contract

Each package must define `build` (`directus-extension build`) and `dev` (`directus-extension build -w --no-minify`) scripts, and point `directus:extension.path` at `dist/index.js`. The bundle is self-contained (dependencies are inlined), so Docker only needs `dist/`. Build one package with `pnpm --filter <name> build`.

### Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Watch-build every package |
| `pnpm build` | Build every package |
| `pnpm directus:up` / `directus:down` | Start / stop the instance |
| `pnpm directus:logs` | Tail Directus logs |
| `pnpm directus:restart` | Restart Directus |
| `pnpm directus:reset` | Stop and wipe local DB + uploads |

### Playground

`apps/playground` is a Nuxt app (http://localhost:3000) for trying the Google login flows against the local Directus.

1. In `.env` set `SHILP_GOOGLE_AUTH_CLIENT_ID`, `SHILP_GOOGLE_AUTH_CLIENT_SECRET` and `SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST=http://localhost:3000`.
2. In the Google console add the redirect URI `http://localhost:8055/shilp/google-auth/callback` (and `http://localhost:3000` as a JavaScript origin for the button flow).
3. In Directus (Settings > Project Settings > User Registration) turn on Public Registration and pick a role, so new Google users can be created.
4. `pnpm build && pnpm directus:up`, then `pnpm playground`.

For the Google button flow also set `NUXT_PUBLIC_GOOGLE_CLIENT_ID` in `apps/playground/.env`.

## License

[MIT](LICENSE) © 7Span
