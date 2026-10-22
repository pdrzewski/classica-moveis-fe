import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// var ip-backend = ${process.env.IP_BACKEND }}; 
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/backend-api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend-api/, ''),
      },
    },
  },
})
