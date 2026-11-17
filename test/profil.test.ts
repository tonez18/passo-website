import { describe, expect, it } from 'vitest';
import { profil, zone } from '../src/plaene/profil';
import type { Schritt, Training } from '../src/plaene/leser';

const training = (schritte: Schritt[]): Training => ({
  name: 'Probe',
  beschreibung: '',
  schritte,
  sekunden: schritte.reduce((s, x) => s + (x.art === 'intervalle' ? x.wiederholungen * (x.an.sekunden + x.aus.sekunden) : x.sekunden), 0),
});
const ftp = (prozent: number) => ({ art: 'ftp' as const, prozent });
const summe = (t: Training) => profil(t).reduce((s, b) => s + b.anteil, 0);

describe('Zonen', () => {
  it('haben die Obergrenzen 55, 75, 90, 105, 120 und 150 % FTP', () => {
    expect([54, 55, 56, 75, 90, 105, 120, 150, 151].map(zone)).toEqual([1, 1, 2, 2, 3, 4, 5, 6, 7]);
  });
});

describe('Trainingsprofil', () => {
  it('ein gleichmäßiger Schritt ist ein Balken in seiner Zone', () => {
    const b = profil(training([{ art: 'gleich', sekunden: 720, leistung: ftp(90) }]));
    expect(b).toHaveLength(1);
    expect(b[0].anteil).toBe(1);
    expect(b[0].hoehe).toBeCloseTo(0.6);
    expect(b[0].zone).toBe(3);
    expect(b[0].titel).toBe('Zone 3 · 12 min · 90 % FTP');
  });
  it('150 % FTP ist die volle Höhe, mehr wird gekappt', () => {
    const b = profil(training([{ art: 'gleich', sekunden: 30, leistung: ftp(150) }, { art: 'gleich', sekunden: 30, leistung: ftp(200) }]));
    expect(b.map((x) => x.hoehe)).toEqual([1, 1]);
    expect(b.map((x) => x.zone)).toEqual([6, 7]);
    expect(b[0].titel).toBe('Zone 6 · 30 s · 150 % FTP');
  });
  it('Intervalle 5 × (180 s an, 180 s aus) geben 10 Balken', () => {
    const b = profil(training([{ art: 'intervalle', wiederholungen: 5, an: { sekunden: 180, leistung: ftp(115) }, aus: { sekunden: 180, leistung: ftp(50) } }]));
    expect(b).toHaveLength(10);
    expect(b.map((x) => x.zone)).toEqual([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]);
    expect(b[0].titel).toBe('Intervall 1/5 · 3 min · 115 % FTP');
    expect(b[9].titel).toBe('Pause 5/5 · 3 min · 50 % FTP');
    expect(b.every((x) => Math.abs(x.anteil - 0.1) < 1e-9)).toBe(true);
  });
  it('eine Rampe 45→75 % über 600 s wird zu mehreren Stufen mit steigender Höhe', () => {
    const b = profil(training([{ art: 'rampe', sekunden: 600, von: ftp(45), bis: ftp(75), rolle: 'einfahren' }]));
    expect(b.length).toBeGreaterThan(1);
    for (let i = 1; i < b.length; i++) expect(b[i].hoehe).toBeGreaterThan(b[i - 1].hoehe);
    expect(b[0].hoehe).toBeGreaterThanOrEqual(45 / 150);
    expect(b[b.length - 1].hoehe).toBeLessThanOrEqual(75 / 150);
    expect(b[0].titel).toBe('Einfahren · 10 min · 45–75 % FTP');
    expect(b[0].anschluss).toBeFalsy();
    expect(b.slice(1).every((x) => x.anschluss)).toBe(true);
    expect(summe(training([{ art: 'rampe', sekunden: 600, von: ftp(45), bis: ftp(75) }]))).toBeCloseTo(1);
  });
  it('benennt Rampen nach ihrer Rolle', () => {
    expect(profil(training([{ art: 'rampe', sekunden: 300, von: ftp(70), bis: ftp(45), rolle: 'ausfahren' }]))[0].titel).toBe('Ausfahren · 5 min · 70–45 % FTP');
    expect(profil(training([{ art: 'rampe', sekunden: 90, von: ftp(50), bis: ftp(56) }]))[0].titel).toBe('Rampe · 1:30 min · 50–56 % FTP');
  });
  it('ein Watt-Schritt ist grau, halb hoch und nennt die Watt', () => {
    const b = profil(training([{ art: 'gleich', sekunden: 1200, leistung: { art: 'watt', watt: 220 } }]));
    expect(b).toHaveLength(1);
    expect(b[0].zone).toBeNull();
    expect(b[0].hoehe).toBe(0.5);
    expect(b[0].titel).toContain('220 W');
    expect(b[0].titel).toContain('20 min');
  });
  it('ein freier Schritt ist grau und heißt „frei“', () => {
    const b = profil(training([{ art: 'frei', sekunden: 1800 }]));
    expect(b[0].zone).toBeNull();
    expect(b[0].hoehe).toBe(0.5);
    expect(b[0].titel).toContain('frei');
    expect(b[0].titel).toContain('30 min');
  });
  it('Rampen und Intervalle in Watt bleiben grau', () => {
    const rampe = profil(training([{ art: 'rampe', sekunden: 300, von: { art: 'watt', watt: 200 }, bis: { art: 'watt', watt: 120 } }]));
    expect(rampe).toHaveLength(1);
    expect(rampe[0].zone).toBeNull();
    expect(rampe[0].titel).toContain('200–120 W');
    const iv = profil(training([{ art: 'intervalle', wiederholungen: 2, an: { sekunden: 60, leistung: { art: 'watt', watt: 300 } }, aus: { sekunden: 60, leistung: ftp(50) } }]));
    expect(iv.map((x) => x.zone)).toEqual([null, 1, null, 1]);
    expect(iv[0].titel).toBe('Intervall 1/2 · 1 min · 300 W');
  });
  it('die Anteile ergeben zusammen 1', () => {
    const t = training([
      { art: 'rampe', sekunden: 600, von: ftp(45), bis: ftp(75) },
      { art: 'intervalle', wiederholungen: 3, an: { sekunden: 720, leistung: ftp(90) }, aus: { sekunden: 300, leistung: ftp(55) } },
      { art: 'frei', sekunden: 333 },
      { art: 'gleich', sekunden: 77, leistung: { art: 'watt', watt: 180 } },
      { art: 'rampe', sekunden: 300, von: ftp(60), bis: ftp(45) },
    ]);
    expect(summe(t)).toBeCloseTo(1, 9);
  });
});
