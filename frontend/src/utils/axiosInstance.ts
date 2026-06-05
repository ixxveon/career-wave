import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Request interceptor: Access Token 주입
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: RTR(Refresh Token Rotation) 처리
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    // TODO: 401 시 refresh token으로 재발급 로직 구현
    return Promise.reject(error);
  }
);

export default axiosInstance;
