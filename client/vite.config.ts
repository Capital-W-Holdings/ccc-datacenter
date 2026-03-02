import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Production fallback values - used if env vars are missing
const PRODUCTION_API_URL = 'https://ccc-summit-intel-server-production.up.railway.app'
const PRODUCTION_WS_URL = 'https://ccc-summit-intel-server-production.up.railway.app'

export default defineConfig(({ mode }) => {
  const isProd = mode === 'production'

  // ALWAYS use hardcoded URLs in production - ignore env vars completely
  // This fixes Vercel not picking up env vars correctly
  const apiUrl = isProd ? PRODUCTION_API_URL : 'http://localhost:3001'
  const wsUrl = isProd ? PRODUCTION_WS_URL : 'http://localhost:3001'

  // Log what we're building with
  console.log(`[Vite Config] Mode: ${mode}`)
  console.log(`[Vite Config] API URL: ${apiUrl}`)
  console.log(`[Vite Config] WS URL: ${wsUrl}`)

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // FORCE these values in production - override everything
    define: isProd ? {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
      'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
    } : {},
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },
  }
})
