// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://tarot-for-beginners.eu.org',
  output: 'static',
  build: {
    format: 'directory'
  }
});
