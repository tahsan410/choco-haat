export class ApiError extends Error {
  constructor(message, { code = 'ERROR', errors = null, status = 0, data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.errors = errors;
    this.status = status;
    this.data = data;
  }
}

export const friendly = (err, fallback = 'Something went wrong. Please try again.') =>
  err instanceof ApiError ? err.message : fallback;
