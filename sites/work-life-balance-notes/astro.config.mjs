// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://work-life-balance-notes.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
