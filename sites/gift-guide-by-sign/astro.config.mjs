// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://gift-guide-by-sign.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
