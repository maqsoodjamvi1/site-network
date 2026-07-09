// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://budget-travel-notes.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
