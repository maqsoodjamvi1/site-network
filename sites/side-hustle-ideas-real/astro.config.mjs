// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://side-hustle-ideas-real.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
