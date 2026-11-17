# Passo-Webseite

Die deutsche Webseite zur Indoor-Cycling-App Passo: Startseite, Trainingspläne zum Laden, Download und Spende. Statische Seite, gebaut mit Astro; kein Tracking, keine Cookies, keine fremden Server.

Alle Rechte vorbehalten. Dieses Repo hat keine Lizenz; Texte, Bilder und Code dürfen nicht ohne Zustimmung weiterverwendet werden. Die Schrift Inter steht unter der OFL (`public/fonts/OFL.txt`).

## Bauen

```
npm install
npm run dev       # Entwicklung unter http://localhost:4321/passo-website/
npm test          # Tests (Vitest)
npm run build     # fertige Seite nach dist/
npm run preview   # gebaute Seite ansehen
npm run pruefung  # Bildschirmfotos der gebauten Seite nach pruefung/ausgabe/
```

Links, Adressen und Schalter stehen in `src/einstellungen.ts`. Ein leerer Link zeigt den Knopf als „Bald verfügbar“.
