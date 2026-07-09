// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://breakup-recovery-guide.pages.dev',
  output: 'static',
  build: {
    format: 'directory'
  }
});
