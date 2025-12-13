import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Erlaube Zugriff von allen Netzwerk-Interfaces
    port: Number(process.env.VITE_PORT) || 5173,  // Port über Umgebungsvariable konfigurierbar
    strictPort: false,  // Falls Port belegt, nächsten freien Port verwenden
  },
})
