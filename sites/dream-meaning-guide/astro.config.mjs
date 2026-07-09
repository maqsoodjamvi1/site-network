// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://dream-meaning-guide.eu.org',
  output: 'static',
  build: {
    format: 'directory'
  }
});
