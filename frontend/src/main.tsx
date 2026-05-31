import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

async function prepare() {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass', // MSW 핸들러 없는 요청은 그대로 통과
    });
  }
}

prepare().then(() => {
  createRoot(document.getElementById('root')!).render(
    <App />
  );
});
