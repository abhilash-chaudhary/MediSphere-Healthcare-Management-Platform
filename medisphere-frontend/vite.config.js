import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': 'http://localhost:8080',
      '/patients': 'http://localhost:8080',
      '/twin': 'http://localhost:8080',
      '/consent': 'http://localhost:8080',
      '/provider': 'http://localhost:8080',
      '/wearable': 'http://localhost:8080',
      '/dashboard': 'http://localhost:8080',
      '/fhir': 'http://localhost:8080',
      '/audit': 'http://localhost:8080',
      '/stream': 'http://localhost:8080',
      '/notifications': 'http://localhost:8080',
      '/admin': 'http://localhost:8080',
      '/vitals': 'http://localhost:8080',
      '/labs': 'http://localhost:8080',
      '/appointments': 'http://localhost:8080',
      '/actuator': 'http://localhost:8080',
      '/api/prediction': 'http://localhost:8080',
      '/api/explanation': 'http://localhost:8080',
      '/api/model': 'http://localhost:8080'
    }
  }
})
