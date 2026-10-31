import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function copyStatic() {
  return {
    name: 'copy-extension-static',
    closeBundle() {
      const dist = path.resolve(root, 'dist');
      mkdirSync(path.resolve(dist, 'icons'), { recursive: true });
      cpSync(path.resolve(root, 'icons'), path.resolve(dist, 'icons'), { recursive: true });
      const manifest = JSON.parse(readFileSync(path.resolve(root, 'manifest.json'), 'utf8')) as {
        side_panel: { default_path: string };
        background: { service_worker: string; type: string };
      };
      manifest.side_panel.default_path = 'sidepanel.html';
      manifest.background.service_worker = 'background.js';
      writeFileSync(path.resolve(dist, 'manifest.json'), JSON.stringify(manifest, null, 2));
    },
  };
}

export default defineConfig({
  root,
  base: './',
  publicDir: false,
  plugins: [react(), copyStatic()],
  build: {
    outDir: path.resolve(root, 'dist'),
    emptyOutDir: true,
    modulePreload: false,
    rollupOptions: {
      input: {
        sidepanel: path.resolve(root, 'sidepanel.html'),
        background: path.resolve(root, 'src/background.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
