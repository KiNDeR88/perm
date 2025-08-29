import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/pb': {
        target: 'https://site-v2.apipb.ru',
        changeOrigin: true,
        secure: false,
        rewrite: p => p.replace(/^\/pb/, ''),
      },
    },
    hmr: { overlay: true },
  },
})
