import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
      // 代理 WebSocket 请求
      '/ws': {
        target: 'ws://127.0.0.1:8080', // 你的后端 WebSocket 地址
        ws: true, // 必须设置为 true
        changeOrigin: true,
      }
    }
  }
})