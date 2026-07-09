// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://new-parent-survival.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
