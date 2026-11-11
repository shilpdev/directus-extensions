import { DIRECTUS_USER_PROVIDER } from '../constants'
import type { EndpointContext, GoogleProfile } from '../types'
import { LoginError } from './errors'

const USER_COLUMNS = ['id', 'status', 'provider', 'tfa_secret', 'external_identifier']

const identifierFor = (profile: GoogleProfile) => `google:${profile.sub}`

async function findUser(context: EndpointContext, profile: GoogleProfile) {
  const byIdentifier = await context
    .database('directus_users')
    .select(USER_COLUMNS)
    .where({ provider: DIRECTUS_USER_PROVIDER, external_identifier: identifierFor(profile) })
    .first()

  if (byIdentifier) return byIdentifier

  // Google verified the email, so an existing user with the same email is the same person
  return context
    .database('directus_users')
    .select(USER_COLUMNS)
    .whereRaw('LOWER(??) = ?', ['email', profile.email])
    .first()
}

// Directus' own Public Registration settings (Settings > Project Settings > User Registration)
async function readRegistrationSettings(context: EndpointContext) {
  const settings = await context
    .database('directus_settings')
    .select('public_registration', 'public_registration_role')
    .first()

  return {
    isEnabled: Boolean(settings?.public_registration),
    role: settings?.public_registration_role ?? null,
  }
}

/*
 * Returns the id of the Directus user for this Google account, registering
 * them on first login. Users created here have no password, so they can only
 * sign in through Google (or after a password reset).
 */
export async function findOrCreateUser(context: EndpointContext, profile: GoogleProfile): Promise<string> {
  const user = await findUser(context, profile)

  if (user) {
    if (user.status !== 'active') {
      throw new LoginError(403, 'USER_NOT_ACTIVE', 'This account is not active')
    }

    // Users of other providers (LDAP, SAML, ...) and users with 2FA must use their own login
    if (user.provider !== DIRECTUS_USER_PROVIDER || user.tfa_secret) {
      throw new LoginError(403, 'USER_NOT_ALLOWED', 'This account cannot sign in with Google')
    }

    return user.id
  }

  const registration = await readRegistrationSettings(context)

  if (!registration.isEnabled) {
    throw new LoginError(403, 'SIGNUP_DISABLED', 'Public registration is disabled')
  }

  if (!registration.role) {
    throw new LoginError(500, 'MISCONFIGURED', 'The public registration role is not set in Directus settings')
  }

  // No accountability: the user is created by the system, not by an end user
  const users = new context.services.UsersService({
    schema: await context.getSchema(),
    knex: context.database,
  })

  return users.createOne({
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    role: registration.role,
    status: 'active',
    provider: DIRECTUS_USER_PROVIDER,
    external_identifier: identifierFor(profile),
  })
}
