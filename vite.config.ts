import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import pkg from './package.json';

export default defineConfig(({ mode }) => {
  // 📌 base path للنشر على GitHub Pages
  // لو غيرت اسم المستودع، حدّث هذا
  // لو تنشر على root (مثلاً VPS)، استخدم '/'
  const base = process.env.VITE_BASE_PATH || '/';

  return {
    base,
    // versione dell'app disponibile nel codice (usata dal sistema di update)
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version),
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',  // 🔧 السماح بالوصول من الأجهزة الأخرى على الـ LAN
      port: 3000,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
