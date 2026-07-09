// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://sleep-better-guide.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
