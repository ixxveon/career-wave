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

  // 204 No Content 또는 빈 바디 응답은 null 반환 (JSON 파싱 시도 않음)
  const contentType = response.headers.get('content-type');
  const contentLength = response.headers.get('content-length');
  if (
    response.status === 204 ||
    contentLength === '0' ||
    !contentType?.includes('application/json')
  ) {
    return null;
  }

  return response.json();
}
