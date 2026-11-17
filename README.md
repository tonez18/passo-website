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
```

## Prüfen

Alle Prüfungen laufen gegen die gebaute Seite in `dist/` (vorher `npm run build`).

```
node pruefung/links.mjs             # keine toten internen Links, Bilder, Sprungziele; beachtet basisPfad
node pruefung/veroeffentlichung.mjs # fehlende Angaben, Platzhalter „[fehlt: …]“, Downloads byte-gleich
node pruefung/zustaende.mjs         # ohne JavaScript, ohne Maus, „Bewegung reduzieren“, Tastatur
npm run pruefung                    # Bildschirmfotos nach pruefung/ausgabe/ (390, 820, 1440; dunkel und hell)
```

Die Fotos und `zustaende.mjs` brauchen Google Chrome oder einen Chromium von Playwright auf dem Rechner.

## Einstellungen

Alle Links, Adressen und Schalter stehen in `src/einstellungen.ts`:

| Feld | Bedeutung |
|---|---|
| `seitenUrl` | Adresse ohne Pfad, z. B. `https://tonez18.github.io` |
| `basisPfad` | Unterpfad mit Schrägstrich vorn und hinten (`/passo-website/`), mit eigener Domain `/` |
| `indexierbar` | `false` hält Suchmaschinen fern: `noindex` auf jeder Seite, `robots.txt` sperrt |
| `testflightUrl` | öffentlicher TestFlight-Link; der Knopf heißt dann „Beta laden“. Keine Pflicht: ohne ihn steht „Bald verfügbar“ |
| `appStoreUrl` | App-Store-Link; ist er gesetzt, heißt der Knopf „Im App Store laden“ und der Beta-Hinweis entfällt |
| `kofiUrl` | Ko-fi-Seite für den Spendenknopf |
| `kontaktEmail` | E-Mail für Kontakt, Impressum und Datenschutz |
| `impressum` | Name, Straße mit Hausnummer, Postleitzahl mit Ort |

Ein leerer Link zeigt den Knopf als „Bald verfügbar“, ohne Link. Leere Angaben stehen in Impressum und Datenschutz als sichtbarer Platzhalter „[fehlt: …]“. Solange etwas fehlt, schlägt `node pruefung/veroeffentlichung.mjs` fehl und nennt die Felder; die GitHub Action stellt dann nichts bereit.

Impressum und Datenschutz (`src/pages/impressum.astro`, `src/pages/datenschutz.astro`) sind Entwürfe und keine Rechtsberatung. Vor der Veröffentlichung lesen und bei Bedarf prüfen lassen.

## Plan einstellen

1. Plan in Passo bauen und über „Teilen“ als `.passoplan`-Datei exportieren.
2. Datei in den Ordner `plaene/` legen und hochladen (auf GitHub: „Add file › Upload files“).
3. Die Seite baut sich neu: Der Plan steht in der Übersicht, hat seine eigene Seite und seinen Download.

Ändern heißt Datei ersetzen, löschen heißt Datei entfernen. Dateiname, Reihenfolge und die freiwillige Begleitdatei sind in `plaene/LIESMICH.md` beschrieben. Lässt sich eine Datei nicht lesen, bricht der Bau mit einer deutschen Meldung ab, die Datei und Grund nennt; die bisherige Seite bleibt online.

## Veröffentlichen

Die Datei `.github/workflows/seite.yml` baut bei jedem Push auf `main` und stellt die Seite auf GitHub Pages bereit: `npm ci`, Tests, Bau, Linkprüfung, Veröffentlichungsprüfung, dann Bereitstellen. Schlägt ein Schritt fehl, bleibt die alte Seite online.

Einmalig:

1. Angaben in `src/einstellungen.ts` eintragen (TestFlight, Ko-fi, E-Mail, Impressum), bis `node pruefung/veroeffentlichung.mjs` durchläuft.
2. Auf GitHub ein öffentliches Repo `passo-website` anlegen. Heißt es anders, `basisPfad` anpassen; unter einem anderen Konto auch `seitenUrl`.
3. Im Repo unter „Settings › Pages“ als Quelle „GitHub Actions“ wählen.
4. `main` hochladen. Die Seite steht danach unter `https://<konto>.github.io/passo-website/`.

Unter der GitHub-Adresse bleibt `indexierbar` auf `false`. Die `robots.txt` liegt dort im Unterpfad und wird von Suchmaschinen nicht gelesen; fern hält sie das `noindex` auf jeder Seite.

### Später: eigene Domain

1. In `src/einstellungen.ts`: `seitenUrl: 'https://<domain>'`, `basisPfad: '/'`, `indexierbar: true`.
2. Datei `public/CNAME` anlegen, einzige Zeile: die Domain (ohne `https://`).
3. Beim Anbieter der Domain die DNS-Einträge für GitHub Pages setzen und unter „Settings › Pages“ die Domain eintragen, „Enforce HTTPS“ einschalten.
4. Bauen und `node pruefung/links.mjs` laufen lassen; die Linkprüfung beachtet den neuen `basisPfad`.

Mit `indexierbar: true` entfällt `noindex`, die `robots.txt` gibt alles frei und nennt die Sitemap (`sitemap-index.xml`, enthält alle Seiten samt Planseiten).

## Schrift, Teilbild, Höhenlinien

- **Schrift:** Inter 400–800 als WOFF2 in `public/fonts/`, beschnitten auf Latin und Latin-Extended samt Anführungszeichen, Strichen, Pfeilen und Herz (zusammen rund 100 kB). Neu erzeugen aus den TTF der App (`assets/fonts/` im App-Repo), ohne Abhängigkeit im Projekt:

  ```
  uvx --from 'fonttools[woff]' pyftsubset Inter-Regular.ttf --output-file=Inter-Regular.woff2 --flavor=woff2 \
    --unicodes='U+0020-007E,U+00A0-017F,U+0218-021B,U+02C6,U+02DA,U+02DC,U+2009,U+200A,U+202F,U+2010-2015,U+2018-201A,U+201C-201E,U+2020-2022,U+2026,U+2030,U+2032,U+2033,U+2039,U+203A,U+20AC,U+2122,U+2190-2199,U+2212,U+2248,U+2260,U+2264,U+2265,U+2665' \
    --layout-features='kern,liga,calt,ccmp,locl,mark,mkmk,tnum,case' --no-hinting --desubroutinize
  ```

  Kommt ein Zeichen außerhalb dieser Bereiche auf die Seite, zeigt der Browser es in der Systemschrift; dann den Bereich ergänzen.
- **Teilbild und Touch-Icon:** `node werkzeug/teilbild.mjs` erzeugt `public/teilbild.png` (1200 × 630) und `public/apple-touch-icon.png` (180 × 180).
- **Höhenlinien:** `werkzeug/gen-topo.cjs` erzeugt `src/bausteine/Hoehenlinien.astro`.
