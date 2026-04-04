export const ERROR_CODES = {
  AUTH_REQUIRED: { code: 'AUTH_REQUIRED', message: '로그인이 필요합니다', status: 401 },
  AUTH_INVALID_CREDENTIALS: { code: 'AUTH_INVALID_CREDENTIALS', message: '이메일 또는 비밀번호가 올바르지 않습니다', status: 401 },
  VALIDATION_ERROR: { code: 'VALIDATION_ERROR', message: '입력값이 올바르지 않습니다', status: 400 },
  NOT_FOUND: { code: 'NOT_FOUND', message: '리소스를 찾을 수 없습니다', status: 404 },
  CALC_LIMIT_EXCEEDED: { code: 'CALC_LIMIT_EXCEEDED', message: '무료 계정은 최대 5개까지 저장 가능합니다', status: 403 },
  CALC_NOT_OWNER: { code: 'CALC_NOT_OWNER', message: '본인의 계산만 수정/삭제할 수 있습니다', status: 403 },
  SUB_ALREADY_ACTIVE: { code: 'SUB_ALREADY_ACTIVE', message: '이미 활성 구독이 있습니다', status: 409 },
  SUB_REQUIRED: { code: 'SUB_REQUIRED', message: '프리미엄 구독이 필요합니다', status: 403 },
  STRIPE_ERROR: { code: 'STRIPE_ERROR', message: '결제 처리 중 오류가 발생했습니다', status: 500 },
  INTERNAL_ERROR: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다', status: 500 },
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
