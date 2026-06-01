import { memberAuthApi, memberRegisterApi } from './member';

export const authApi = {
  login: (payload) => memberAuthApi.login(payload),

  register: (payload) => memberRegisterApi.registerUser(payload),

  getProfile: () => memberAuthApi.getMyStatus(),
};
