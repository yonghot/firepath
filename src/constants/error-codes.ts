export const ERROR_CODES = {
  AUTH_REQUIRED: { code: 'AUTH_REQUIRED', message: 'Sign-in is required', status: 401 },
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: 'Incorrect email or password', status: 401 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: 'Invalid input', status: 400 },
  NOT_FOUND: { code: 'NOT_FOUND', message: 'Resource not found', status: 404 },
  CALC_LIMIT_EXCEEDED: { code: 'CALC_LIMIT_EXCEEDED', message: 'Free accounts can save up to 5 calculations', status: 403 },
  CALC_NOT_OWNER: { code: 'CALC_NOT_OWNER', message: 'You can only edit or delete your own calculations', status: 403 },
  SUB_ALREADY_ACTIVE: { code: 'SUB_ALREADY_ACTIVE', message: 'You already have an active subscription', status: 409 },
  SUB_REQUIRED: { code: 'SUB_REQUIRED', message: 'A premium subscription is required', status: 403 },
  STRIPE_ERROR: { code: 'STRIPE_ERROR', message: 'An error occurred while processing the payment', status: 500 },
  STRIPE_NOT_CONFIGURED: { code: 'STRIPE_NOT_CONFIGURED', message: 'Payments are not available', status: 503 },
  DB_ERROR: { code: 'DB_ERROR', message: 'A database error occurred', status: 500 },
  SERVICE_UNAVAILABLE: { code: 'SERVICE_UNAVAILABLE', message: 'The service is temporarily unavailable', status: 503 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: 'A server error occurred', status: 500 },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export class AppError extends Error {
  code: string;
  status: number;

  constructor(errorCode: ErrorCode, details?: string) {
    const { code, message, status } = ERROR_CODES[errorCode];
    super(details ? `${message}: ${details}` : message);
    this.code = code;
    this.status = status;
  }
}
