import { apiClient } from './apiClient';

export const authApi = {
  login: (payload) =>
    apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  register: (payload) =>
    apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProfile: () => apiClient('/members/me'),
};
