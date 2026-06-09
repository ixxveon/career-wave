export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 64;

export function validatePasswordPolicy(password: string, loginId?: string): PasswordPolicyResult {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    errors.push('비밀번호는 8자 이상 64자 이하로 입력해주세요.');
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    errors.push('영문, 숫자, 특수문자를 함께 사용해주세요.');
  }

  if (loginId && password.toLowerCase().includes(loginId.toLowerCase())) {
    errors.push('아이디가 포함되지 않은 비밀번호를 사용해주세요.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function isPasswordConfirmed(password: string, passwordConfirm: string): boolean {
  return password.length > 0 && password === passwordConfirm;
}
