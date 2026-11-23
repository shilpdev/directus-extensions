export class ContentGeneratorError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(`[${code}] ${message}`)
    this.name = 'ContentGeneratorError'
  }

  // Directus stores a rejected step with JSON.stringify, which skips the
  // non-enumerable `message` of an Error. Without this the flow logs and the
  // webhook response would show only `code` and `name`.
  toJSON() {
    return { name: this.name, code: this.code, message: this.message }
  }
}
