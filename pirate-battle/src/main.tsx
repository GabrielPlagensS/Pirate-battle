import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { MOCK_API_LOST_EVENT } from './api/guards';
import './styles/global.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

const MOCK_START_TIMEOUT_MS = 4000;

type MockWorker = (typeof import('./mocks/browser'))['worker'];

async function startWorker(worker: MockWorker) {
  // Se o Service Worker for um stub/inválido, start() nunca resolve. Sem o timeout
  // isso deixava a página em branco; agora o app abre e só ranking/histórico falham.
  await Promise.race([
    worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true,
      serviceWorker: { url: '/mockServiceWorker.js' }
    }),
    new Promise<void>((_, reject) =>
      setTimeout(() => reject(new Error('MSW service worker did not start in time')), MOCK_START_TIMEOUT_MS)
    )
  ]);
}

async function startMockApi() {
  try {
    const { worker } = await import('./mocks/browser');
    await startWorker(worker);
    watchMockApi(worker);
  } catch (error) {
    console.error('Mock API unavailable. Run: npx msw init public/ --save', error);
  }
}

/**
 * O navegador encerra Service Workers ociosos. Ao acordar, o worker do MSW perdeu a
 * lista de abas ativas (fica só em memória) e deixa as requisições passarem direto
 * para o servidor. Quando uma resposta inválida é detectada (api/guards.ts), ou a aba
 * volta a ficar visível, refazemos o handshake com `stop()` + `start()`.
 */
function watchMockApi(worker: MockWorker) {
  let restarting = false;
  const restart = async () => {
    if (restarting) return;
    restarting = true;
    try {
      worker.stop();
      await startWorker(worker);
    } catch (error) {
      console.error('Could not reactivate the mock API', error);
    } finally {
      restarting = false;
    }
  };
  const isAlive = async () => {
    try {
      const response = await fetch('/api/health', { cache: 'no-store' });
      return ((await response.json()) as { ok?: boolean }).ok === true;
    } catch {
      return false; // sem mock, o Vite devolve HTML e o json() falha
    }
  };

  window.addEventListener(MOCK_API_LOST_EVENT, () => void restart());
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void isAlive().then((alive) => (alive ? undefined : restart()));
  });
}

async function bootstrap() {
  await startMockApi();
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
}

void bootstrap();
