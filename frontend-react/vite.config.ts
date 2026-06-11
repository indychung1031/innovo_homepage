import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Innovo 홈페이지 React — 로컬 API·업로드 프록시 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '');
  const useHp = env.VITE_USE_HP_API !== 'false';
  const hpTarget = env.VITE_HP_PROXY_TARGET || env.VITE_HP_API_BASE_URL || 'http://54.116.87.172';

  const proxy: Record<string, { target: string; changeOrigin: boolean }> = {};

  // HP API — 로컬에서 상대경로 /api/hp 호출 시 ERP로 프록시 (CORS 회피)
  if (useHp) {
    proxy['/api/hp'] = { target: hpTarget, changeOrigin: true };
  }

  proxy['/api'] = { target: 'http://127.0.0.1:8000', changeOrigin: true };
  proxy['/admin/api'] = { target: 'http://127.0.0.1:8000', changeOrigin: true };
  proxy['/upload'] = { target: 'http://127.0.0.1:8000', changeOrigin: true };

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(rootDir, 'src'),
        '@content': path.resolve(rootDir, '../frontend/content'),
      },
    },
    server: {
      port: 5173,
      proxy,
    },
  };
});
