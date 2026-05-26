import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/react-router')) return 'vendor';
          if (id.includes('node_modules/recharts')) return 'charts';
          if (id.includes('node_modules/jspdf')) return 'pdf';
          if (id.includes('node_modules/xlsx')) return 'excel';
          if (id.includes('node_modules/drizzle-orm') || id.includes('node_modules/dexie')) return 'db';
          if (id.includes('node_modules/@tanstack/react-table')) return 'table';
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
