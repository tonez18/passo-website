// Prüft jede Seitenart in den Zuständen, in denen nichts unsichtbar bleiben darf: node pruefung/zustaende.mjs
//  – ohne JavaScript, – mit „Bewegung reduzieren“, – ohne Maus (Touch, Telefonbreite), – mit Maus (Vergleich).
// Je Zustand: Nach dem Durchscrollen ist kein Inhalt ausgeblendet oder verdeckt (.rv, Geräte, Stempel, Abdeckungen der Profile),
// Menü und Umschalter funktionieren oder fehlen sauber, es gibt keinen Überlauf.
// Dazu ein Tastaturdurchlauf: Jedes Ziel der Tab-Taste ist sichtbar umrandet, „Bald verfügbar“ ist kein Ziel.
import os from 'node:os';
import { chromium } from 'playwright-core';
import { starteServer, findeChromium } from './server.mjs';

const SEITEN = { start: '', plaene: 'plaene/', plan: 'plaene/ftp-verbessern/', impressum: 'impressum/', datenschutz: 'datenschutz/', 404: '404.html' };
const ZUSTAENDE = {
  'ohne JavaScript': { viewport: { width: 390, height: 844 }, javaScriptEnabled: false, hasTouch: true, isMobile: true },
  'Bewegung reduziert': { viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' },
  'ohne Maus': { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
  'Tablet ohne Maus': { viewport: { width: 820, height: 1180 }, hasTouch: true },
  'mit Maus': { viewport: { width: 1440, height: 900 } },
};

const server = await starteServer();
const browser = await chromium.launch({ executablePath: findeChromium(os) });
let fehler = 0;
const melde = (ok, text) => { if (!ok) fehler++; console.log((ok ? '  ok      ' : '  FEHLER  ') + text); };

for (const [name, pfad] of Object.entries(SEITEN)) {
  console.log('\n' + name);
  for (const [zustand, optionen] of Object.entries(ZUSTAENDE)) {
    const kontext = await browser.newContext({ colorScheme: 'dark', ...optionen });
    const seite = await kontext.newPage();
    const meldungen = [];
    seite.on('pageerror', (e) => meldungen.push(e.message));
    await seite.goto(server.url + pfad);
    const mitJs = optionen.javaScriptEnabled !== false;
    // Durchscrollen wie ein Leser; ohne JavaScript über die Tastatur (evaluate gibt es dann nicht)
    if (mitJs) {
      const hoehe = await seite.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y <= hoehe; y += 400) { await seite.evaluate((v) => window.scrollTo(0, v), y); await seite.waitForTimeout(90); }
      await seite.waitForTimeout(1800);
    } else {
      await seite.keyboard.press('End');
      await seite.waitForTimeout(300);
    }
    const unsichtbar = await seite.locator('.rv, .devs, .stamp, .dev img, main h1, main h2, main p, .unit, .plan').evaluateAll((teile) => teile.filter((el) => {
      // die jeweils andere Bildfassung (dunkel/hell) ist mit Absicht ausgeblendet
      if (el.matches('.im-d, .im-l') && getComputedStyle(el).display === 'none') return false;
      // am Telefon zeigt der Hero nur das iPhone, das iPad entfällt mit Absicht
      if (el.closest('.devs .pad') && getComputedStyle(el.closest('.devs .pad')).display === 'none') return false;
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const s = getComputedStyle(e);
        if (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity) < 0.99) return true;
      }
      return false;
    }).map((el) => el.tagName.toLowerCase() + '.' + el.className).slice(0, 5));
    const verdeckt = await seite.locator('.cover').evaluateAll((teile) => teile.filter((el) => {
      const m = new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return m.a > 0.01;
    }).length);
    const kopf = await seite.locator('html').evaluate((html) => {
      const sichtbar = (el) => !!el && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
      return {
        ueberlauf: html.scrollWidth - html.clientWidth,
        umschalter: sichtbar(document.getElementById('th')),
        menueKnopf: sichtbar(document.getElementById('menuB')),
        linksSichtbar: [...document.querySelectorAll('#nav a')].filter((a) => sichtbar(a) && sichtbar(document.getElementById('nav')) && a.getBoundingClientRect().width > 0).length,
        route: html.classList.contains('route-on'),
        anim: html.classList.contains('anim'),
      };
    });
    let zusatz = '';
    if (!mitJs) {
      melde(!kopf.umschalter && !kopf.menueKnopf && kopf.linksSichtbar === 3, `${zustand}: Umschalter und Menüknopf fehlen, die 3 Menülinks stehen offen da`);
    } else if (optionen.viewport.width < 700) {
      await seite.evaluate(() => window.scrollTo(0, 0));
      await seite.locator('#menuB').click();
      await seite.waitForTimeout(400);
      const offen = await seite.locator('#nav a').first().isVisible();
      await seite.locator('#th').click();
      const thema = await seite.locator('html').getAttribute('data-thema');
      melde(offen && thema === 'hell', `${zustand}: Menü klappt auf, Umschalter stellt auf hell`);
    } else {
      await seite.evaluate(() => window.scrollTo(0, 0));
      await seite.locator('#th').click();
      melde((await seite.locator('html').getAttribute('data-thema')) === 'hell', `${zustand}: Umschalter stellt auf hell`);
    }
    if (zustand === 'Bewegung reduziert') zusatz = kopf.anim ? ' (FEHLER: Startzustände der Bewegung aktiv)' : ', keine Startzustände der Bewegung';
    if (zustand === 'Bewegung reduziert' && kopf.anim) fehler++;
    melde(unsichtbar.length === 0 && verdeckt === 0 && kopf.ueberlauf <= 0 && meldungen.length === 0,
      `${zustand}: nichts unsichtbar (${unsichtbar.length}), nichts verdeckt (${verdeckt}), Überlauf ${kopf.ueberlauf}, Route ${kopf.route ? 'an' : 'aus'}${zusatz}${unsichtbar.length ? ' → ' + unsichtbar.join(', ') : ''}${meldungen.length ? ' → ' + meldungen.join('; ') : ''}`);
    await kontext.close();
  }

  // Tastatur: einmal mit Tab durch die ganze Seite
  const seite = await browser.newPage({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await seite.goto(server.url + pfad);
  await seite.waitForTimeout(400);
  const ziele = await seite.locator('a[href], button, summary, video[controls], [tabindex]').evaluateAll((t) => t.filter((el) => el.getClientRects().length && el.tabIndex >= 0).length);
  const gesehen = new Set();
  let ohneRand = 0;
  let toteZiele = 0;
  // Der Film hat eigene Bedienelemente; dort bleibt der Fokus für mehrere Tab-Schritte auf dem <video>.
  let wiederholt = 0;
  for (let i = 0; i < ziele + 40; i++) {
    await seite.keyboard.press('Tab');
    const stand = await seite.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      if (!el.dataset.tabNr) el.dataset.tabNr = String(document.querySelectorAll('[data-tab-nr]').length + 1);
      const s = getComputedStyle(el);
      return { nr: el.dataset.tabNr, rand: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0, tot: el.getAttribute('aria-disabled') === 'true' || /Bald verfügbar/.test(el.textContent ?? '') };
    });
    if (!stand) continue;
    if (gesehen.has(stand.nr)) { if (stand.nr === '1' || ++wiederholt > 20) break; continue; }
    gesehen.add(stand.nr);
    if (!stand.rand) ohneRand++;
    if (stand.tot) toteZiele++;
  }
  melde(gesehen.size >= ziele && ohneRand === 0 && toteZiele === 0, `Tastatur: ${gesehen.size} von ${ziele} Zielen erreicht, ${ohneRand} ohne sichtbaren Fokus, ${toteZiele}-mal „Bald verfügbar“ im Durchlauf`);
  await seite.close();
}
await browser.close();
await server.stop();
if (fehler) { console.error(`\n${fehler} Befund(e).`); process.exit(1); }
console.log('\nAlle Zustände in Ordnung.');
