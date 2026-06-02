import { MEMBER_TYPE, type LoginRequest, type MemberType } from '../../types/member';

export type LoginTab = 'personal' | 'company';

export interface LoginFormValues {
  loginId: string;
  password: string;
}

export interface LoginFormErrors {
  loginId?: string;
  password?: string;
  form?: string;
}

export const LOGIN_TAB_TO_MEMBER_TYPE: Record<LoginTab, MemberType> = {
  personal: MEMBER_TYPE.USER,
  company: MEMBER_TYPE.COMPANY,
};

export function validateLoginForm(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};

  if (!values.loginId.trim()) {
    errors.loginId = '아이디를 입력해주세요.';
  }

  if (!values.password) {
    errors.password = '비밀번호를 입력해주세요.';
  }

  return errors;
}

export function hasLoginFormErrors(errors: LoginFormErrors): boolean {
  return Object.values(errors).some(Boolean);
}

export function toLoginRequest(values: LoginFormValues, tab: LoginTab): LoginRequest {
  return {
    loginId: values.loginId.trim(),
    password: values.password,
    memberType: LOGIN_TAB_TO_MEMBER_TYPE[tab],
  };
}
