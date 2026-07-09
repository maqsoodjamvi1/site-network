// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://love-language-lab.eu.org',
  output: 'static',
  build: {
    format: 'directory'
  }
});
