// Kleiner Server für die Prüfungen: liefert dist/ unter dem Unterpfad aus den Einstellungen (wie GitHub Pages).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { einstellungen } from '../src/einstellungen.ts';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const arten = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

/** Startet den Server auf einem freien Port; gibt Adresse der Startseite und stop() zurück. */
export async function starteServer() {
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/ fehlt. Erst „npm run build“ ausführen.');
  const basis = einstellungen.basisPfad;
  const server = http.createServer((anfrage, antwort) => {
    const pfadname = decodeURIComponent(new URL(anfrage.url, 'http://x').pathname);
    if (!pfadname.startsWith(basis)) { antwort.writeHead(404).end('Nicht gefunden'); return; }
    let datei = path.join(dist, pfadname.slice(basis.length));
    if (!datei.startsWith(dist)) { antwort.writeHead(403).end(); return; }
    if (fs.existsSync(datei) && fs.statSync(datei).isDirectory()) datei = path.join(datei, 'index.html');
    if (!fs.existsSync(datei)) { antwort.writeHead(404).end('Nicht gefunden'); return; }
    antwort.writeHead(200, { 'Content-Type': arten[path.extname(datei)] ?? 'application/octet-stream' });
    fs.createReadStream(datei).pipe(antwort);
  });
  await new Promise((fertig) => server.listen(0, '127.0.0.1', fertig));
  const { port } = server.address();
  return { url: `http://127.0.0.1:${port}${basis}`, stop: () => new Promise((fertig) => server.close(fertig)) };
}

/** Sucht einen Chromium für Playwright: zuerst den Playwright-Cache, sonst Google Chrome. */
export function findeChromium(os) {
  const cache = path.join(os.homedir(), 'Library/Caches/ms-playwright');
  const treffer = [];
  for (const ordner of fs.existsSync(cache) ? fs.readdirSync(cache) : []) {
    if (!ordner.startsWith('chromium_headless_shell-')) continue;
    for (const unter of fs.readdirSync(path.join(cache, ordner))) {
      const p = path.join(cache, ordner, unter, 'headless_shell');
      if (fs.existsSync(p)) treffer.push(p);
    }
  }
  treffer.sort();
  return treffer.length ? treffer[treffer.length - 1] : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}
