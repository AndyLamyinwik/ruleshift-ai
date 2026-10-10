import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/ruleshift-ai/',
  plugins: [react()],
});
