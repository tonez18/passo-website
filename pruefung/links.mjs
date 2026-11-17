// Linkprüfung der gebauten Seite: node pruefung/links.mjs
// Läuft über dist/ und prüft jede interne Adresse (href, src, srcset, poster, url() im CSS, kanonische Adresse,
// Teilbild, Sitemap) gegen eine vorhandene Datei, unter Beachtung von basisPfad. Sprungziele (#abschnitt) müssen
// auf der Zielseite als id vorhanden sein. Eine interne Adresse ohne den Unterpfad gilt als Fehler (pfad() vergessen).
// Fremde Adressen (https://…, mailto:) werden gezählt, aber nicht aufgerufen. Endet bei Treffern mit Fehler.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { einstellungen } from '../src/einstellungen.ts';

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('dist/ fehlt. Erst „npm run build“ ausführen.'); process.exit(1); }
const basis = einstellungen.basisPfad;
const herkunft = einstellungen.seitenUrl.replace(/\/+$/, '');

const dateien = [];
(function sammle(ordner) {
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) sammle(p); else dateien.push(p);
  }
})(dist);

const entschluessle = (t) => t.replace(/&amp;/g, '&').replace(/&#38;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'");
const idsJeDatei = new Map();
function ids(datei) {
  if (!idsJeDatei.has(datei)) idsJeDatei.set(datei, new Set([...fs.readFileSync(datei, 'utf8').matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  return idsJeDatei.get(datei);
}

/** Datei in dist zu einem Pfad der Seite (mit Unterpfad); null, wenn es sie nicht gibt. */
function zielDatei(pfadname) {
  let datei = path.join(dist, decodeURIComponent(pfadname.slice(basis.length)));
  if (!datei.startsWith(dist)) return null;
  if (fs.existsSync(datei) && fs.statSync(datei).isDirectory()) datei = path.join(datei, 'index.html');
  return fs.existsSync(datei) ? datei : null;
}

const tote = [];
let intern = 0;
let fremd = 0;
function pruefe(adresse, quelle, art) {
  adresse = entschluessle(adresse.trim());
  if (!adresse || adresse.startsWith('data:') || adresse.startsWith('mailto:') || adresse.startsWith('tel:')) return;
  const wo = path.relative(dist, quelle);
  // Adressen mit eigener Herkunft (kanonisch, Teilbild, Sitemap) zählen als intern
  if (adresse.startsWith(herkunft + '/') || adresse === herkunft) adresse = adresse.slice(herkunft.length) || '/';
  if (/^[a-z][a-z0-9+.-]*:/i.test(adresse) || adresse.startsWith('//')) { fremd++; return; }
  intern++;
  let [pfadname, anker] = adresse.split('#');
  pfadname = pfadname.split('?')[0];
  let datei;
  if (pfadname === '') datei = quelle; // nur Sprungziel auf derselben Seite
  else if (pfadname.startsWith('/')) {
    if (!pfadname.startsWith(basis)) { tote.push(`${wo}: ${art} „${adresse}“ liegt außerhalb des Unterpfads ${basis} (pfad() vergessen?)`); return; }
    datei = zielDatei(pfadname);
  } else {
    // relative Adresse: von der Adresse der Quelle aus
    const von = basis + path.relative(dist, quelle).split(path.sep).join('/').replace(/index\.html$/, '');
    datei = zielDatei(new URL(pfadname, 'http://x' + von).pathname);
  }
  if (!datei) { tote.push(`${wo}: ${art} „${adresse}“ führt zu keiner Datei`); return; }
  if (anker && datei.endsWith('.html') && !ids(datei).has(decodeURIComponent(anker))) tote.push(`${wo}: ${art} „${adresse}“ – das Sprungziel #${anker} gibt es dort nicht`);
}

for (const datei of dateien) {
  const endung = path.extname(datei);
  if (endung === '.html') {
    const html = fs.readFileSync(datei, 'utf8');
    for (const m of html.matchAll(/\s(href|src|poster)="([^"]*)"/g)) pruefe(m[2], datei, m[1]);
    for (const m of html.matchAll(/\ssrcset="([^"]*)"/g)) for (const teil of m[1].split(',')) pruefe(teil.trim().split(/\s+/)[0], datei, 'srcset');
    for (const m of html.matchAll(/<meta[^>]+(?:property|name)="(og:image|og:url|twitter:image)"[^>]+content="([^"]*)"/g)) pruefe(m[2], datei, m[1]);
    for (const m of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!m[1].startsWith('#')) pruefe(m[1], datei, 'url()');
  } else if (endung === '.css') {
    for (const m of fs.readFileSync(datei, 'utf8').matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) if (!m[1].startsWith('#')) pruefe(m[1], datei, 'url()');
  } else if (endung === '.xml') {
    for (const m of fs.readFileSync(datei, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) pruefe(m[1], datei, 'Sitemap');
  } else if (path.basename(datei) === 'robots.txt') {
    for (const m of fs.readFileSync(datei, 'utf8').matchAll(/^Sitemap:\s*(\S+)/gm)) pruefe(m[1], datei, 'Sitemap');
  }
}

console.log(`Linkprüfung mit Unterpfad „${basis}“: ${dateien.length} Dateien, ${intern} interne Adressen geprüft, ${fremd} fremde gezählt.`);
if (tote.length) {
  console.error(`${tote.length} tote Adresse(n):`);
  for (const t of [...new Set(tote)]) console.error('  – ' + t);
  process.exit(1);
}
console.log('Keine toten Links.');
