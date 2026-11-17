// Bildschirmfotos der gebauten Seite: node pruefung/bilder.mjs [seite] [breite]
// Je Seite 390, 820 und 1440 px, dunkel und hell, als Ausschnitt oben („-oben“) und als ganze Seite, nach pruefung/ausgabe/.
// Die ganze Seite wird am Seitenende aufgenommen, damit Route und Einblendungen fertig sind. Der angeheftete Kopf
// würde dabei mitten im Foto landen; nur für das Foto steht er im Seitenfluss (ebenso der Ladeknopf am Telefon).
// Dazu je Aufnahme: Überlauf, kaputte Bilder, Fehler in der Konsole.
// Planseite zusätzlich: ein Foto mit sichtbarem Balken-Hinweis („plan-1440-<design>-hinweis“).
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { starteServer, findeChromium } from './server.mjs';

const SEITEN = { start: '', plaene: 'plaene/', plan: 'plaene/ftp-verbessern/' };
const nurSeite = process.argv[2] && process.argv[2] !== 'alle' ? process.argv[2] : null;
const nurBreite = process.argv[3];
const ausgabe = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ausgabe');
fs.mkdirSync(ausgabe, { recursive: true });

const server = await starteServer();
const browser = await chromium.launch({ executablePath: findeChromium(os) });
let fehler = 0;
for (const [name, pfad] of Object.entries(SEITEN)) for (const breite of [390, 820, 1440]) for (const [design, schema] of [['dunkel', 'dark'], ['hell', 'light']]) {
  if ((nurSeite && nurSeite !== name) || (nurBreite && nurBreite !== String(breite))) continue;
  const kontext = await browser.newContext({ viewport: { width: breite, height: breite === 390 ? 844 : breite === 820 ? 1180 : 900 }, colorScheme: schema, deviceScaleFactor: 1, hasTouch: breite < 1000, isMobile: breite < 500 });
  const seite = await kontext.newPage();
  const meldungen = [];
  seite.on('console', (m) => { if (m.type() === 'error') meldungen.push(m.text()); });
  seite.on('pageerror', (e) => meldungen.push('Seitenfehler: ' + e.message));
  seite.on('requestfailed', (r) => meldungen.push('nicht geladen: ' + r.url()));
  seite.on('response', (r) => { if (r.status() >= 400) meldungen.push(r.status() + ': ' + r.url()); });
  await seite.goto(server.url + pfad);
  await seite.waitForTimeout(1800);
  await seite.screenshot({ path: path.join(ausgabe, `${name}-${breite}-${design}-oben.png`) });
  const hoehe = await seite.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < hoehe; y += 500) { await seite.evaluate((v) => window.scrollTo(0, v), y); await seite.waitForTimeout(140); }
  await seite.waitForTimeout(900);
  const stand = await seite.evaluate(() => ({
    ueberlauf: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    kaputt: [...document.images].filter((b) => b.offsetParent && b.complete && !b.naturalWidth).map((b) => b.src),
    position: document.getElementById('posT')?.textContent ?? '',
  }));
  await seite.addStyleTag({ content: '.head{position:relative!important}.dlbar{position:static!important}body{padding-bottom:0!important}' });
  await seite.waitForTimeout(700);
  await seite.screenshot({ path: path.join(ausgabe, `${name}-${breite}-${design}.png`), fullPage: true });
  if (stand.ueberlauf || stand.kaputt.length || meldungen.length) fehler++;
  console.log(name, breite, design, '| Höhe', hoehe, '| Überlauf', stand.ueberlauf, '| kaputte Bilder', stand.kaputt.length, '| Position am Ende:', stand.position || '–', '|', meldungen.length ? meldungen : 'keine Fehler');
  await kontext.close();
}
// Balken-Hinweis auf der Planseite
if ((!nurSeite || nurSeite === 'plan') && (!nurBreite || nurBreite === '1440')) for (const [design, schema] of [['dunkel', 'dark'], ['hell', 'light']]) {
  const seite = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: schema });
  await seite.goto(server.url + SEITEN.plan);
  await seite.waitForTimeout(500);
  const balken = seite.locator('#woche-2 .unit:first-child .wprof rect').nth(8);
  await balken.scrollIntoViewIfNeeded();
  await seite.waitForTimeout(1600);
  const kasten = await balken.boundingBox();
  await seite.mouse.move(kasten.x + kasten.width / 2 - 20, kasten.y + kasten.height / 2);
  await seite.mouse.move(kasten.x + kasten.width / 2, kasten.y + kasten.height / 2, { steps: 4 });
  await seite.waitForTimeout(500);
  const stand = await seite.evaluate(() => ({ an: document.getElementById('tip').classList.contains('on'), text: document.getElementById('tip').textContent }));
  if (!stand.an || !stand.text) fehler++;
  console.log('Hinweis', design, '|', stand.an ? 'sichtbar' : 'NICHT sichtbar', '|', stand.text);
  await seite.screenshot({ path: path.join(ausgabe, `plan-1440-${design}-hinweis.png`) });
  await seite.close();
}
await browser.close();
await server.stop();
if (fehler) { console.error(`${fehler} Aufnahme(n) mit Befund.`); process.exit(1); }
