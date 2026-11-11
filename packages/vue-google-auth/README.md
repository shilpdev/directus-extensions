# @shilp.dev/vue-google-auth

Headless Google OAuth components for Vue 3.5+. You write the markup. The components handle the login flow and the session state.

It is not tied to any backend. You describe how your backend works with an **adapter**.

```bash
pnpm add @shilp.dev/vue-google-auth
```

## Usage

```vue
<script setup lang="ts">
import { Auth, AuthLoginButton, AuthLogoutButton, AuthSignedIn, AuthSignedOut, AuthUser } from '@shilp.dev/vue-google-auth'
import { adapter } from './adapter'
</script>

<template>
  <Auth :adapter="adapter">
    <AuthSignedOut>
      <AuthLoginButton start-url="https://api.example.com/google/start" v-slot="{ login }">
        <button @click="login">Login with Google</button>
      </AuthLoginButton>
    </AuthSignedOut>

    <AuthSignedIn>
      <AuthUser v-slot="{ user }">{{ user.email }}</AuthUser>
      <AuthLogoutButton v-slot="{ logout }"><button @click="logout">Log out</button></AuthLogoutButton>
    </AuthSignedIn>
  </Auth>
</template>
```

The page Google (through your backend) returns to renders `<AuthCallback>`, which finishes the login and emits `success` with the page to open next.

## Adapter

```ts
import type { AuthAdapter } from '@shilp.dev/vue-google-auth'

const adapter: AuthAdapter = {
  // The signed in user, or null when there is no session. Also used to restore a session on app start.
  getUser: async () => { /* ... */ },
  // Redirect flow: trade the one time code from the callback URL for a session
  exchangeCode: async (code) => { /* ... */ },
  // Google button flow: trade Google's ID token for a session
  exchangeCredential: async (credential) => { /* ... */ },
  // End the session on the backend
  logout: async () => { /* ... */ },
  // Optional. Receives { log, expire }: `log` writes to the log, `expire` tells the components the
  // session ended on its own (for example a token refresh failed).
  connect: ({ log, expire }) => { /* ... */ },
}
```

Every method should throw an `Error` with a readable message when it fails.

## Components

Every component renders only its slot (with a small default markup) and shows itself only in the state it belongs to. All of them must be inside `<Auth>`.

| Component | Shows when | Slot props | Props (defaults) |
| --- | --- | --- | --- |
| `Auth` | always | the auth context | `adapter` (required) |
| `AuthLoading` | status is `loading` | `context` | |
| `AuthSignedIn` / `AuthSignedOut` | authenticated / anonymous | `context` | |
| `AuthLoginButton` | not authenticated | `login`, `isPending` | `startUrl` (required), `callbackPath` (`/auth/callback`), `returnTo` (`/`), `returnToKey` |
| `AuthGoogleButton` | not authenticated | `not-configured` slot | `clientId`, `theme` (`outline`), `size` (`large`), `text` (`signin_with`), `shape` (`rectangular`) |
| `AuthCallback` | always, draws nothing | `context` | `returnToKey` |
| `AuthError` | an error is set | `error`, `dismiss` | |
| `AuthUser` | authenticated | `user` | |
| `AuthLogoutButton` | authenticated | `logout`, `isPending` | |
| `AuthLog` | always | `logs` | |

## Google conventions

The components follow Google's standard names, so they are not configurable:

- The login button sends the browser to your `startUrl` with `?redirect_uri=<callback URL>`.
- The callback page receives `?code=...` on success or `?error=...` on failure.

## Reading the session

`<Auth>` holds the session state and shares it with every component inside it (provide/inject). It restores the session when it mounts, so the state starts as `loading`. To read it in your own components, call `useAuthContext()` inside `<Auth>`:

```ts
import { useAuthContext } from '@shilp.dev/vue-google-auth'

const context = useAuthContext()
// context.status: 'loading' | 'authenticated' | 'anonymous'
// context.user, context.error, context.logs
```

Because the state lives in the component tree, there is nothing to read before `<Auth>` mounts, so route guards cannot use it. Protect a page in the page itself: show `<AuthLoading>` while the status is `loading`, and redirect when it becomes `anonymous`.

## Development

```bash
pnpm dev     # rebuild on change
pnpm build   # production build into dist/
```
