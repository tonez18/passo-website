// Adresse und Unterpfad stehen an einer Stelle: src/einstellungen.ts
import { defineConfig } from 'astro/config';
import { einstellungen } from './src/einstellungen.ts';

export default defineConfig({
  site: einstellungen.seitenUrl,
  base: einstellungen.basisPfad,
  trailingSlash: 'always',
  devToolbar: { enabled: false },
});
