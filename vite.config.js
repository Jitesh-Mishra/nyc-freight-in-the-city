import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Relative base: the build works on GitHub Pages under any repository name
export default defineConfig({
  base: './',
  plugins: [vue()],
  build: { chunkSizeWarningLimit: 2500 }
})
