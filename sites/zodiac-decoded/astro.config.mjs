// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://zodiac-decoded.eu.org',
  output: 'static',
  build: {
    format: 'directory'
  }
});
