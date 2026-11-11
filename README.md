# Directus Extensions

Monorepo (pnpm workspaces) for Directus extensions, with a single local Directus instance running in Docker for development.

## Layout

```
packages/        one folder per package
  directus-google-auth   Directus endpoint extension (Google login)
  vue-google-auth        Headless Google OAuth components for Vue
apps/playground  Nuxt app that uses both packages
docker/          local sqlite DB + uploads (gitignored)
docker-compose.yml
```

## Getting started

```bash
pnpm install
pnpm build               # Docker loads the built dist/ of each package
cp .env.example .env     # required: docker-compose.yml reads all settings from .env
pnpm directus:up         # http://localhost:8055  (admin@example.com / admin)
```

## Adding an extension

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

## Build contract

Each package must define `build` (`directus-extension build`) and `dev` (`directus-extension build -w --no-minify`) scripts, and point `directus:extension.path` at `dist/index.js`. The bundle is self-contained (dependencies are inlined), so Docker only needs `dist/`. Build one package with `pnpm --filter <name> build`.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm dev` | Watch-build every package |
| `pnpm build` | Build every package |
| `pnpm directus:up` / `directus:down` | Start / stop the instance |
| `pnpm directus:logs` | Tail Directus logs |
| `pnpm directus:restart` | Restart Directus |
| `pnpm directus:reset` | Stop and wipe local DB + uploads |

## Playground

`apps/playground` is a Nuxt app (http://localhost:3000) for trying the Google login flows against the local Directus.

1. In `.env` set `SHILP_GOOGLE_AUTH_CLIENT_ID`, `SHILP_GOOGLE_AUTH_CLIENT_SECRET` and `SHILP_GOOGLE_AUTH_REDIRECT_ALLOW_LIST=http://localhost:3000`.
2. In the Google console add the redirect URI `http://localhost:8055/shilp/google-auth/callback` (and `http://localhost:3000` as a JavaScript origin for the button flow).
3. In Directus (Settings > Project Settings > User Registration) turn on Public Registration and pick a role, so new Google users can be created.
4. `pnpm build && pnpm directus:up`, then `pnpm playground`.

For the Google button flow also set `NUXT_PUBLIC_GOOGLE_CLIENT_ID` in `apps/playground/.env`.
