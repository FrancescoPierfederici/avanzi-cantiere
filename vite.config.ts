import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // il worker di MapLibre 6 è un modulo ES
  worker: { format: 'es' },
  // MapLibre da sola pesa ~1 MB: sta già in un chunk caricato in lazy solo per la mappa
  build: { chunkSizeWarningLimit: 1100 },
})
