/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// `npm run dev` also serves the API (server/app.ts) under /api on the same port, so there is only one
// process to start and the session cookie works without CORS. Production uses server/index.ts instead.
function campusConnectApi(): Plugin {
  return {
    name: 'campusconnect-api',
    apply: 'serve',
    async configureServer(server) {
      if (process.env.VITEST) return;
      const { createApp } = await server.ssrLoadModule('/server/app.ts');
      const { openDb } = await server.ssrLoadModule('/server/db.ts');
      server.middlewares.use(createApp(openDb()));
    },
  }
}

// Figma Make's preview-only plugins were dropped; they need the Make sandbox's .figma/ folder.
export default defineConfig({
  plugins: [react(), tailwindcss(), campusConnectApi()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
