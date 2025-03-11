import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: true, // Listen on all network interfaces
    port: 5173, // Default Vite por
  }
}) 