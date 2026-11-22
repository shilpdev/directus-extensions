# Directus image with the extensions in ./packages baked in.
# Build:  docker compose -f docker-compose.build.yml up -d --build
#
# Stage 1 builds the extension, stage 2 copies only its package.json and dist/
# into Directus' extensions folder, which is where Directus looks for them.

FROM node:22-alpine AS builder
WORKDIR /repo
RUN corepack enable

# Manifests first so the dependency layer is cached until a dependency changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/google-auth/package.json packages/google-auth/package.json
RUN pnpm install --frozen-lockfile --filter @shilp.dev/directus-google-auth

COPY packages/google-auth packages/google-auth
RUN pnpm --filter @shilp.dev/directus-google-auth build

FROM directus/directus:11
COPY --from=builder --chown=node:node /repo/packages/google-auth/package.json /directus/extensions/google-auth/package.json
COPY --from=builder --chown=node:node /repo/packages/google-auth/dist /directus/extensions/google-auth/dist
