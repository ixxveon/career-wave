import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // /v1/* — documentApi, interviewApi 등 /api 미사용 레거시 경로 대응
      '/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // /jobs/* — 채용공고 API 경로 대응
      '/jobs': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true, // WebSocket 프록시 활성화
      },
    },
  },
});
