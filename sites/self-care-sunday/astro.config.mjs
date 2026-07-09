// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://self-care-sunday.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
