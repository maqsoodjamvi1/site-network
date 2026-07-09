// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://remote-work-life.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
