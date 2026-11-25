import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Ghi ra precache-manifest.json: danh sách mọi file của bản build để service worker
 * lưu sẵn, giúp trang mở được khi không có mạng.
 */
function precacheManifest(): Plugin {
  return {
    name: 'precache-manifest',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      this.emitFile({
        type: 'asset',
        fileName: 'precache-manifest.json',
        source: JSON.stringify({ version: Date.now(), files })
      });
    }
  };
}

export default defineConfig({
  // Đường dẫn tương đối để chạy được dưới https://<user>.github.io/<repo>/
  base: './',
  plugins: [react(), tailwindcss(), precacheManifest()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, '.')
    }
  },
  build: {
    // three.js là một thư viện ~530 kB, không chia nhỏ thêm được
    chunkSizeWarningLimit: 600,
    rolldownOptions: {
      output: {
        // Tách thư viện lớn ra file riêng để trình duyệt tải song song và lưu cache lâu dài
        codeSplitting: {
          groups: [
            { name: 'three', test: /node_modules[\\/]three[\\/]/ },
            { name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ },
            { name: 'motion', test: /node_modules[\\/](motion|motion-dom|motion-utils|framer-motion)[\\/]/ },
            { name: 'mediapipe', test: /node_modules[\\/]@mediapipe[\\/]/ }
          ]
        }
      }
    }
  }
});
