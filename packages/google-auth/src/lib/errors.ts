export class LoginError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
  }
}

export const notConfiguredError = () =>
  new LoginError(503, 'NOT_CONFIGURED', 'Login with Google is not configured')
