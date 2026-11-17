// Erzeugt einmalig das Teilbild für soziale Netze (public/teilbild.png, 1200 × 630, dunkel) und das Touch-Icon
// (public/apple-touch-icon.png, 180 × 180) mit Playwright. Aufruf: node werkzeug/teilbild.mjs
// Nur nötig, wenn sich Zeichen, Claim oder das App-Bild ändern; die PNGs liegen im Repo.
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findeChromium } from '../pruefung/server.mjs';

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const daten = (datei, art) => `data:${art};base64,` + fs.readFileSync(path.join(wurzel, datei)).toString('base64');
const schrift = (schnitt, gewicht) => `@font-face{font-family:Inter;src:url(${daten(`public/fonts/Inter-${schnitt}.woff2`, 'font/woff2')}) format("woff2");font-weight:${gewicht}}`;
const zeichen = (groesse) => `<svg viewBox="0 0 48 48" width="${groesse}" height="${groesse}"><path d="M4 39 L15 17 C18.5 10.5 21 21 24 21 C27 21 29.5 10.5 33 17 L44 39" fill="none" stroke="#2DD4BF" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="21" r="3.6" fill="#E8EBF0"/></svg>`;

// Höhenlinien als ruhiger Grund: ein paar versetzte Kurven, dieselbe Anmutung wie die Hero-Karte
const linien = Array.from({ length: 11 }, (_, i) => {
  const y = 40 + i * 62;
  return `<path d="M-20 ${y}c160-${50 + i * 4} 300 ${30 + i * 3} 470-10s260-${70 - i * 3} 420-${20 + i * 2} 250 ${60 - i * 2} 360 10" fill="none" stroke="${i % 5 === 0 ? '#40506A' : '#2B374A'}" stroke-width="${i % 5 === 0 ? 1.7 : 1}"/>`;
}).join('');

const teilbild = `<!doctype html><html lang="de"><meta charset="utf-8"><style>
${schrift('Regular', 400)}${schrift('Bold', 700)}${schrift('ExtraBold', 800)}
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;background:#0B0E14;color:#E8EBF0;font-family:Inter,sans-serif;overflow:hidden;position:relative;-webkit-font-smoothing:antialiased}
.l{position:absolute;inset:0}
.s{position:absolute;inset:0;background:radial-gradient(60% 80% at 26% 50%,rgba(11,14,20,.94) 0,rgba(11,14,20,.7) 60%,rgba(11,14,20,.15) 100%)}
.t{position:absolute;left:76px;top:72px;width:700px}
.b{display:flex;align-items:center;gap:14px;font-size:38px;font-weight:700;letter-spacing:-.035em}
h1{font-size:84px;line-height:.98;font-weight:800;letter-spacing:-.045em;margin-top:92px}
p{font-size:28px;line-height:1.4;color:#8B93A5;margin-top:30px;max-width:560px}
.r{position:absolute;left:76px;bottom:64px;display:flex;align-items:center;gap:14px;font-size:20px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8B93A5}
.r i{width:54px;height:4px;border-radius:2px;background:#2DD4BF}
.d{position:absolute;right:104px;top:66px;width:300px;background:#05070B;border-radius:48px;padding:11px;box-shadow:0 40px 80px -20px rgba(0,0,0,.7),0 0 0 1px #2A3342;transform:rotate(4deg)}
.d img{display:block;width:100%;border-radius:38px}
</style><body>
<svg class="l" viewBox="0 0 1200 630">${linien}</svg><div class="s"></div>
<div class="t"><div class="b">${zeichen(56)}Passo</div><h1>Indoor fahren.<br>Draußen erleben.</h1><p>Echte Strecken und Trainings auf deinem Smart-Trainer.</p></div>
<div class="r"><i></i>Kostenlos · ohne Konto · ohne Abo</div>
<div class="d"><img src="${daten('src/bilder/dunkel/workout.png', 'image/png')}" alt=""></div>
</body></html>`;

const icon = `<!doctype html><html><style>*{margin:0}body{width:180px;height:180px;background:#0B0E14;display:grid;place-items:center}</style><body>${zeichen(132)}</body></html>`;

const browser = await chromium.launch({ executablePath: findeChromium(os) });
for (const [html, breite, hoehe, datei] of [[teilbild, 1200, 630, 'public/teilbild.png'], [icon, 180, 180, 'public/apple-touch-icon.png']]) {
  const seite = await browser.newPage({ viewport: { width: breite, height: hoehe }, deviceScaleFactor: 1 });
  await seite.setContent(html, { waitUntil: 'load' });
  await seite.evaluate(() => document.fonts.ready);
  await seite.screenshot({ path: path.join(wurzel, datei) });
  await seite.close();
  console.log(datei, breite + ' × ' + hoehe, Math.round(fs.statSync(path.join(wurzel, datei)).size / 1024) + ' kB');
}
await browser.close();
