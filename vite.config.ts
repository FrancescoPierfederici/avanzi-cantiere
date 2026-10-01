import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  // GitHub Pages pubblica il sito in /avanzi-cantiere/: il workflow passa BASE_PATH.
  // In locale resta '/'.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  // il worker di MapLibre 6 è un modulo ES
  worker: { format: 'es' },
  // MapLibre da sola pesa ~1 MB: sta già in un chunk caricato in lazy solo per la mappa
  build: { chunkSizeWarningLimit: 1100 },
})
