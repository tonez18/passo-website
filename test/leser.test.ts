import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { lesePlan, PlanFehler } from '../src/plaene/leser';

const PLAENE = path.resolve(__dirname, '../plaene');
const lies = (name: string) => fs.readFileSync(path.join(PLAENE, name), 'utf8');
const fixture = (name: string) => fs.readFileSync(path.resolve(__dirname, 'fixtures', name), 'utf8');

/** Kleinster gültiger Plan; `aendere` verbiegt ihn für die Fehlerfälle. */
function plan(aendere: (p: any) => void = () => {}): string {
  const p = {
    format: 'passo-plan',
    version: 1,
    plan: { name: 'Probe', description: 'Ein Plan zur Probe.', weeks: [{ note: '', days: { '1': { ref: 'w1' } } }] },
    workouts: [{ ref: 'w1', workout: { name: 'Locker', description: '', steps: [{ type: 'steady', seconds: 600, power: { type: 'ftp', pct: 60 } }] } }],
  };
  aendere(p);
  return JSON.stringify(p);
}
const falschesFormat = plan((p) => { p.format = 'gpx'; });
const refFehlt = plan((p) => { p.plan.weeks[0].days['1'].ref = 'w9'; });
const nullWochen = plan((p) => { p.plan.weeks = []; });
const zuVieleWochen = plan((p) => { p.plan.weeks = Array.from({ length: 53 }, () => ({ note: '', days: { '1': { ref: 'w1' } } })); });
const fremderSchritt = plan((p) => { p.workouts[0].workout.steps.push({ type: 'sprint', seconds: 10 }); });
const mitWattUndFrei = fixture('mit-watt-und-frei.passoplan');

describe('FTP verbessern', () => {
  const p = lesePlan(lies('03-ftp-verbessern.passoplan'), '03-ftp-verbessern.passoplan');
  it('liest Name, Wochen, Notizen und Wochentage', () => {
    expect(p.name).toBe('FTP verbessern');
    expect(p.beschreibung).toMatch(/^Acht Wochen Sweet Spot/);
    expect(p.wochen).toHaveLength(8);
    expect(p.wochen.map((w) => w.nummer)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(p.wochen[0].notiz).toBe('Startwert: Rampentest');
    expect(p.wochen[0].tage.map((t) => t.wochentag)).toEqual([2, 4, 6]);
    expect(p.wochen[0].tage[0].training.name).toBe('Rampentest');
  });
  it('rechnet die Werte wie im freigegebenen Mockup', () => {
    expect(p.einheitenJeWoche).toEqual({ min: 3, max: 3 });
    expect(p.wochen.map((w) => w.minuten)).toEqual([175, 218, 215, 165, 236, 223, 255, 115]);
    expect(p.stundenJeWoche).toEqual({ min: 2, max: 4.5 });
    expect(p.nurFtp).toBe(true);
  });
});

describe('die fünf Startpläne', () => {
  const dateien = fs.readdirSync(PLAENE).filter((d) => d.endsWith('.passoplan'));
  it('sind fünf', () => expect(dateien).toHaveLength(5));
  it.each(dateien)('%s lässt sich lesen', (datei) => {
    const p = lesePlan(lies(datei), datei);
    expect(p.name).not.toBe('');
    expect(p.nurFtp).toBe(true);
    expect(p.wochen.length).toBeGreaterThan(0);
    for (const w of p.wochen) {
      expect(w.minuten).toBeGreaterThan(0);
      for (const t of w.tage) {
        expect(t.training.sekunden).toBeGreaterThan(0);
        expect(t.training.schritte.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Schritte', () => {
  it('zählt Intervalle als Wiederholungen × (an + aus)', () => {
    const p = lesePlan(plan((q) => {
      q.workouts[0].workout.steps = [
        { type: 'ramp', seconds: 600, from: { type: 'ftp', pct: 45 }, to: { type: 'ftp', pct: 75 }, kind: 'warmup' },
        { type: 'intervals', repeat: 5, on: { type: 'steady', seconds: 180, power: { type: 'ftp', pct: 115 } }, off: { type: 'steady', seconds: 180, power: { type: 'ftp', pct: 50 } } },
      ];
    }), 'x.passoplan');
    const t = p.wochen[0].tage[0].training;
    expect(t.sekunden).toBe(600 + 5 * 360);
    expect(p.wochen[0].minuten).toBe(40);
    expect(t.schritte[0]).toMatchObject({ art: 'rampe', sekunden: 600, von: { art: 'ftp', prozent: 45 }, bis: { art: 'ftp', prozent: 75 } });
    expect(t.schritte[1]).toMatchObject({ art: 'intervalle', wiederholungen: 5, an: { sekunden: 180, leistung: { art: 'ftp', prozent: 115 } }, aus: { sekunden: 180, leistung: { art: 'ftp', prozent: 50 } } });
  });
  it('liest feste Watt und freie Abschnitte, der Plan gilt dann nicht mehr als „nur FTP“', () => {
    const p = lesePlan(mitWattUndFrei, 'x.passoplan');
    expect(p.nurFtp).toBe(false);
    expect(p.wochen[0].tage.map((t) => t.wochentag)).toEqual([3, 7]);
    expect(p.wochen[0].tage[0].training.schritte[1]).toEqual({ art: 'gleich', sekunden: 1200, leistung: { art: 'watt', watt: 220 } });
    expect(p.wochen[0].tage[1].training.schritte[0]).toEqual({ art: 'frei', sekunden: 1800 });
    expect(p.einheitenJeWoche).toEqual({ min: 2, max: 2 });
  });
  it('ein einzelner Watt-Schritt reicht für nurFtp = false', () => {
    expect(lesePlan(plan((q) => { q.workouts[0].workout.steps[0].power = { type: 'watts', watts: 150 }; }), 'x.passoplan').nurFtp).toBe(false);
    expect(lesePlan(plan((q) => { q.workouts[0].workout.steps.push({ type: 'free', seconds: 60 }); }), 'x.passoplan').nurFtp).toBe(false);
  });
});

describe('Fehler nennen Datei und Grund auf Deutsch', () => {
  it('kaputtes JSON', () => {
    expect(() => lesePlan('{kaputt', 'x.passoplan')).toThrow(PlanFehler);
    expect(() => lesePlan('{kaputt', 'x.passoplan')).toThrow(/x\.passoplan.*kein gültiges JSON/);
    expect(() => lesePlan('{\n"format": "passo-plan",\n  oje}', 'x.passoplan')).toThrow(/kein gültiges JSON \(Fehler in Zeile 3, Spalte 3\)/);
  });
  it('eine Bytereihenfolge-Marke am Anfang stört nicht', () => {
    expect(lesePlan(String.fromCharCode(0xfeff) + plan(), 'x.passoplan').name).toBe('Probe');
  });
  it('fremdes Format', () => {
    expect(() => lesePlan(falschesFormat, 'x.passoplan')).toThrow(/x\.passoplan.*keine Passo-Plandatei/);
    expect(() => lesePlan('[1,2]', 'x.passoplan')).toThrow(/keine Passo-Plandatei/);
    expect(() => lesePlan(plan((p) => { p.version = 2; }), 'x.passoplan')).toThrow(/Version 2/);
  });
  it('Training fehlt', () => {
    expect(() => lesePlan(refFehlt, 'x.passoplan')).toThrow(PlanFehler);
    expect(() => lesePlan(refFehlt, 'x.passoplan')).toThrow(/x\.passoplan.*Training „w9“ fehlt/);
  });
  it('0 oder mehr als 52 Wochen', () => {
    expect(() => lesePlan(nullWochen, 'x.passoplan')).toThrow(/1 bis 52 Wochen/);
    expect(() => lesePlan(zuVieleWochen, 'x.passoplan')).toThrow(/1 bis 52 Wochen/);
  });
  it('unbekannter Schritt', () => {
    expect(() => lesePlan(fremderSchritt, 'x.passoplan')).toThrow(/x\.passoplan.*unbekannter Schritt „sprint“/);
  });
  it('unbrauchbare Werte', () => {
    expect(() => lesePlan(plan((p) => { p.plan.name = ' '; }), 'x.passoplan')).toThrow(/Name/);
    expect(() => lesePlan(plan((p) => { p.plan.weeks[0].days = { '8': { ref: 'w1' } }; }), 'x.passoplan')).toThrow(/Wochentag „8“/);
    expect(() => lesePlan(plan((p) => { p.workouts[0].workout.steps[0].seconds = 0; }), 'x.passoplan')).toThrow(/Dauer/);
    expect(() => lesePlan(plan((p) => { p.workouts[0].workout.steps[0].power = { type: 'ps', ps: 1 }; }), 'x.passoplan')).toThrow(/Leistung/);
    expect(() => lesePlan(plan((p) => { p.workouts[0].workout.steps = []; }), 'x.passoplan')).toThrow(/keine Schritte/);
  });
});
