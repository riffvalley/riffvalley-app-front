import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),  // 📌 Asegúrate de que esto esté presente
      '@stores': path.resolve(__dirname, 'src/stores'),
      '@views': path.resolve(__dirname, 'src/views'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@helpers': path.resolve(__dirname, 'src/helpers'),
      '@assets': path.resolve(__dirname, 'src/helpers'),
    },
  },
  plugins: [vue()]
});
