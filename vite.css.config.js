import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist/public', // or wherever your Express serves static files
    rollupOptions: {
      input: {
        styles: 'assets/css/styles.css' // adjust path to your SCSS file
      },
      output: {
        assetFileNames: 'styles.css'
      }
    }
  }
})