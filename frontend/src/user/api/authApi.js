import axiosInstance from '../../utils/axiosInstance';

export const authApi = {
  login: (data) => axiosInstance.post('/api/v1/auth/login', data),
  logout: () => axiosInstance.post('/api/v1/auth/logout'),
  signup: (data) => axiosInstance.post('/api/v1/auth/signup', data),
  refresh: () => axiosInstance.post('/api/v1/auth/refresh'),
};
