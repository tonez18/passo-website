import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ausDateiname, sammlePlaene } from '../src/plaene/sammlung';
import { PlanFehler } from '../src/plaene/leser';

const fixtures = path.resolve(__dirname, 'fixtures');

describe('Adresse und Reihenfolge aus dem Dateinamen', () => {
  it('trennt Rang und Adresse', () => {
    expect(ausDateiname('02-ftp-verbessern.passoplan')).toEqual({ slug: 'ftp-verbessern', rang: 2 });
    expect(ausDateiname('Mein Plan.passoplan')).toEqual({ slug: 'mein-plan', rang: null });
  });
  it('schreibt Umlaute und ß aus', () => {
    expect(ausDateiname('grün-ß.passoplan').slug).toBe('gruen-ss');
    expect(ausDateiname('Über Äcker & Öfen.passoplan').slug).toBe('ueber-aecker-oefen');
  });
  it('lässt eine Zahl mitten im Namen stehen', () => {
    expect(ausDateiname('04-vo2max-verbessern.passoplan')).toEqual({ slug: 'vo2max-verbessern', rang: 4 });
    expect(ausDateiname('zone2-grundlage.passoplan')).toEqual({ slug: 'zone2-grundlage', rang: null });
  });
  it('meldet einen Namen, aus dem keine Adresse wird', () => {
    expect(() => ausDateiname('01-.passoplan')).toThrow(PlanFehler);
  });
});

describe('Ordner sammeln', () => {
  it('stellt nummerierte Pläne nach vorn, die übrigen folgen nach Name', async () => {
    const e = await sammlePlaene(path.join(fixtures, 'sammlung'));
    expect(e.map((x) => x.slug)).toEqual(['tal', 'berg', 'alpen-tour', 'zebra']);
    expect(e.map((x) => x.rang)).toEqual([1, 2, null, null]);
    expect(e[0].dateiname).toBe('01-tal.passoplan');
    expect(e[0].plan.name).toBe('Tal');
  });
  it('behält den Inhalt der Datei unverändert', async () => {
    const e = await sammlePlaene(path.join(fixtures, 'sammlung'));
    expect(e[1].roh).toBe(fs.readFileSync(path.join(fixtures, 'sammlung', '02-berg.passoplan'), 'utf8'));
  });
  it('lädt die Begleitdatei <slug>.md als Text, die erste Zeile „titel:“ als Suchmaschinen-Titel', async () => {
    const e = await sammlePlaene(path.join(fixtures, 'sammlung'));
    const alpen = e.find((x) => x.slug === 'alpen-tour')!;
    expect(alpen.seoTitel).toBe('Alpen Tour – der eigene Titel');
    expect(alpen.text).toBe('## Für wen\n\nFür alle, die gern lange fahren.');
    expect(e[0].text).toBeUndefined();
    expect(e[0].seoTitel).toBeUndefined();
  });
  it('bricht bei doppelter Adresse ab und nennt beide Dateien', async () => {
    await expect(sammlePlaene(path.join(fixtures, 'doppelt'))).rejects.toThrow(PlanFehler);
    await expect(sammlePlaene(path.join(fixtures, 'doppelt'))).rejects.toThrow(/01-runde\.passoplan.*Runde\.passoplan.*dieselbe Adresse/);
  });
  it('bricht bei einer unlesbaren Datei ab und nennt sie', async () => {
    const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'passo-plaene-'));
    fs.writeFileSync(path.join(ordner, '09-kaputt.passoplan'), '{kaputt');
    await expect(sammlePlaene(ordner)).rejects.toThrow(/09-kaputt\.passoplan.*kein gültiges JSON/);
    fs.rmSync(ordner, { recursive: true });
  });
  it('liest die fünf Startpläne in der festen Reihenfolge', async () => {
    const e = await sammlePlaene(path.resolve(__dirname, '../plaene'));
    expect(e.map((x) => x.slug)).toEqual(['einsteiger-aufbau', 'zone2-grundlage', 'ftp-verbessern', 'vo2max-verbessern', 'fit-fuer-die-outdoor-saison']);
  });
  it('rechnet Wochenminuten und Stunden aller fünf Pläne wie das freigegebene Mockup', async () => {
    const e = await sammlePlaene(path.resolve(__dirname, '../plaene'));
    expect(e.map((x) => x.plan.wochen.map((w) => w.minuten).join(','))).toEqual([
      '105,140,150,105,155,105',
      '210,210,240,150,255,285,285,210',
      '175,218,215,165,236,223,255,115',
      '210,216,235,165,235,145',
      '210,240,265,180,248,269,284,180,220,135',
    ]);
    expect(e.map((x) => x.plan.stundenJeWoche)).toEqual([{ min: 2, max: 2.5 }, { min: 2.5, max: 5 }, { min: 2, max: 4.5 }, { min: 2.5, max: 4 }, { min: 2.5, max: 4.5 }]);
    expect(e.every((x) => x.plan.einheitenJeWoche.min === 3 && x.plan.einheitenJeWoche.max === 3)).toBe(true);
  });
  it('ein leerer oder fehlender Ordner gibt eine leere Liste', async () => {
    expect(await sammlePlaene(path.join(fixtures, 'gibt-es-nicht'))).toEqual([]);
  });
});
