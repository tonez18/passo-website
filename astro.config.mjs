// Adresse und Unterpfad stehen an einer Stelle: src/einstellungen.ts
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { einstellungen } from './src/einstellungen.ts';

export default defineConfig({
  site: einstellungen.seitenUrl,
  base: einstellungen.basisPfad,
  trailingSlash: 'always',
  devToolbar: { enabled: false },
  // Sitemap mit allen Seiten samt Planseiten; die 404-Seite lässt die Erweiterung von selbst weg.
  integrations: [sitemap()],
});
