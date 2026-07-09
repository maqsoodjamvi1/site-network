// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://student-study-hacks.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
