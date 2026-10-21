import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  // GitHub Pages serves the site at https://bcsaldias.github.io/ai-vsd/ (`vite preview` mirrors that);
  // the dev server stays at /.
  base: command === 'build' || isPreview ? '/ai-vsd/' : '/',
}));
