// Prüfung vor der Veröffentlichung: node pruefung/veroeffentlichung.mjs
// Endet mit Fehler und einer deutschen Liste, solange
//  – in src/einstellungen.ts Pflichtangaben fehlen (Download-Link, Ko-fi, E-Mail, Impressum),
//  – die gebaute Seite noch einen Platzhalter „[fehlt: …]“ enthält,
//  – ein Download in dist/plaene/ nicht byte-gleich mit seiner Quelldatei in plaene/ ist.
// In der GitHub Action läuft sie vor dem Bereitstellen; schlägt sie fehl, bleibt die alte Seite online.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { einstellungen, fehlendeAngaben } from '../src/einstellungen.ts';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(wurzel, 'dist');
if (!fs.existsSync(path.join(dist, 'index.html'))) { console.error('dist/ fehlt. Erst „npm run build“ ausführen.'); process.exit(1); }

const NAMEN = {
  testflightUrl: 'testflightUrl oder appStoreUrl – Link zum Laden der App',
  kofiUrl: 'kofiUrl – Ko-fi-Seite für Spenden',
  kontaktEmail: 'kontaktEmail – E-Mail-Adresse für Kontakt, Impressum und Datenschutz',
  'impressum.name': 'impressum.name – Name für das Impressum',
  'impressum.strasse': 'impressum.strasse – Straße und Hausnummer',
  'impressum.ort': 'impressum.ort – Postleitzahl und Ort',
};
const befunde = [];

const fehlend = fehlendeAngaben();
if (fehlend.length) befunde.push('In src/einstellungen.ts fehlen Angaben:\n' + fehlend.map((f) => '    · ' + (NAMEN[f] ?? f)).join('\n'));

// Platzhalter in der gebauten Seite
const mitPlatzhalter = [];
(function suche(ordner) {
  for (const e of fs.readdirSync(ordner, { withFileTypes: true })) {
    const p = path.join(ordner, e.name);
    if (e.isDirectory()) suche(p);
    else if (/\.(html|txt|xml|json|js|css)$/.test(e.name)) {
      const treffer = [...new Set([...fs.readFileSync(p, 'utf8').matchAll(/\[fehlt: [^\]]*\]/g)].map((m) => m[0]))];
      if (treffer.length) mitPlatzhalter.push(`    · ${path.relative(dist, p)}: ${treffer.join(', ')}`);
    }
  }
})(dist);
if (mitPlatzhalter.length) befunde.push('Die gebaute Seite enthält noch Platzhalter:\n' + mitPlatzhalter.join('\n'));

// Downloads byte-gleich mit den Quelldateien
const quellen = fs.readdirSync(path.join(wurzel, 'plaene')).filter((n) => n.endsWith('.passoplan'));
const zielOrdner = path.join(dist, 'plaene');
const ziele = fs.existsSync(zielOrdner) ? fs.readdirSync(zielOrdner).filter((n) => n.endsWith('.passoplan')).map((n) => fs.readFileSync(path.join(zielOrdner, n))) : [];
const ohneZwilling = quellen.filter((n) => { const q = fs.readFileSync(path.join(wurzel, 'plaene', n)); return !ziele.some((z) => z.equals(q)); });
if (ohneZwilling.length) befunde.push('Diese Plandateien stehen nicht byte-gleich als Download in dist/plaene/:\n' + ohneZwilling.map((n) => '    · plaene/' + n).join('\n'));
if (ziele.length !== quellen.length) befunde.push(`In plaene/ liegen ${quellen.length} Plandateien, in dist/plaene/ aber ${ziele.length} Downloads. Neu bauen: npm run build`);

if (!einstellungen.indexierbar) console.log('Hinweis: „indexierbar“ ist false. Die Seite hält Suchmaschinen fern (noindex, robots.txt sperrt). Mit eigener Domain auf true stellen.');
console.log(`Downloads: ${quellen.length - ohneZwilling.length} von ${quellen.length} Plandateien byte-gleich.`);

if (befunde.length) {
  console.error('\nNoch nicht bereit zur Veröffentlichung:\n');
  befunde.forEach((b, i) => console.error(`${i + 1}. ${b}\n`));
  process.exit(1);
}
console.log('Bereit zur Veröffentlichung: alle Angaben da, keine Platzhalter, Downloads stimmen.');
