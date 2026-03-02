import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Production fallback values - used if env vars are missing
const PRODUCTION_API_URL = 'https://ccc-summit-intel-server-production.up.railway.app'
const PRODUCTION_WS_URL = 'https://ccc-summit-intel-server-production.up.railway.app'

export default defineConfig(({ mode }) => {
  // Load env file based on mode
  const env = loadEnv(mode, process.cwd(), '')

  // For production builds, ensure we use Railway URLs even if env vars are missing
  const isProd = mode === 'production'
  const apiUrl = env.VITE_API_URL || (isProd ? PRODUCTION_API_URL : 'http://localhost:3001')
  const wsUrl = env.VITE_WS_URL || (isProd ? PRODUCTION_WS_URL : 'http://localhost:3001')

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
    // Define global constants for production build
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
