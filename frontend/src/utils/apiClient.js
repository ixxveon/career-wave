const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';

export async function apiClient(endpoint, options = {}) {
  const isFormData = options.body instanceof FormData;

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    // FormData는 브라우저가 Content-Type + boundary를 자동 설정하므로 헤더를 건드리지 않는다
    headers: isFormData
      ? { ...options.headers }
      : { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message = errorBody?.message || `요청 실패 (${response.status})`;
    throw new Error(message);
  }

  return response.json();
}
