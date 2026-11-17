import { describe, expect, it } from 'vitest';
import { klemme, routenStelle, fortschritt, abschnittBei, erreicht, xAufSpur, zahlText, kmText, positionsText, naehern } from '../src/skripte/route';

// Die Wegpunkte der Startseite: km und Höhe vom Start (908 m) bis zur Passhöhe (2 757 m)
const KM = [0, 3.1, 6.4, 9.2, 12.5, 15.8, 18.6, 21.7, 24.4];
const HOEHE = [908, 1120, 1405, 1590, 1870, 2095, 2330, 2560, 2757];
// ihre Lage auf der Seite in px (erfunden, aufsteigend)
const YS = [1000, 1400, 2200, 3600, 4400, 5200, 5800, 6300, 7000];

describe('Scroll-Fortschritt', () => {
  it('klemmt Werte', () => {
    expect(klemme(5, 0, 10)).toBe(5);
    expect(klemme(-1, 0, 10)).toBe(0);
    expect(klemme(11, 0, 10)).toBe(10);
  });
  it('legt den Fahrerpunkt auf 58 % der Fensterhöhe', () => {
    expect(routenStelle(1000, 1000, 0, 500, 3000)).toBe(1580);
    expect(routenStelle(1000, 1000, 80, 500, 3000)).toBe(1500); // Seite beginnt 80 px unter dem Dokumentanfang
  });
  it('bleibt zwischen Start und Ziel', () => {
    expect(routenStelle(0, 1000, 0, 900, 3000)).toBe(900);
    expect(routenStelle(9999, 1000, 0, 900, 3000)).toBe(3000);
  });
  it('gibt den Anteil der Route von 0 bis 1', () => {
    expect(fortschritt(500, 500, 3000)).toBe(0);
    expect(fortschritt(1750, 500, 3000)).toBe(0.5);
    expect(fortschritt(9999, 500, 3000)).toBe(1);
    expect(fortschritt(0, 500, 3000)).toBe(0);
    expect(fortschritt(700, 500, 500)).toBe(0); // Route ohne Länge
  });
});

describe('Wegpunkte', () => {
  it('findet Abschnitt und Anteil', () => {
    expect(abschnittBei(150, [100, 200, 400])).toEqual({ abschnitt: 0, anteil: 0.5 });
    expect(abschnittBei(300, [100, 200, 400])).toEqual({ abschnitt: 1, anteil: 0.5 });
    expect(abschnittBei(400, [100, 200, 400])).toEqual({ abschnitt: 1, anteil: 1 });
    expect(abschnittBei(50, [100, 200, 400])).toEqual({ abschnitt: 0, anteil: 0 });
    expect(abschnittBei(999, [100, 200, 400])).toEqual({ abschnitt: 1, anteil: 1 });
  });
  it('rastet einen Wegpunkt ein, sobald der Fahrer ihn erreicht', () => {
    expect(erreicht(198, 200)).toBe(false);
    expect(erreicht(199.5, 200)).toBe(true);
    expect(erreicht(250, 200)).toBe(true);
  });
  it('liest die Spur zwischen zwei Stützpunkten ab', () => {
    expect(xAufSpur(15, [10, 20], [0, 100])).toBe(50);
    expect(xAufSpur(5, [10, 20], [0, 100])).toBe(0);
    expect(xAufSpur(25, [10, 20], [0, 100])).toBe(100);
    expect(xAufSpur(35, [10, 20, 30, 40], [0, 0, 100, 100])).toBe(100);
  });
});

describe('km und Höhe im Kopf', () => {
  it('schreibt Zahlen mit Tausenderlücke und Komma', () => {
    expect(zahlText(908)).toBe('908');
    expect(zahlText(2757)).toBe('2 757');
    expect(zahlText(1119.6)).toBe('1 120');
    expect(kmText(0)).toBe('0,0');
    expect(kmText(24.4)).toBe('24,4');
    expect(kmText(3.14)).toBe('3,1');
  });
  it('beginnt am Start bei 908 m', () => {
    expect(positionsText(YS[0], YS, KM, HOEHE)).toBe('km 0,0 · 908 m');
    expect(positionsText(0, YS, KM, HOEHE)).toBe('km 0,0 · 908 m');
  });
  it('endet auf der Passhöhe bei 2 757 m', () => {
    expect(positionsText(YS[8], YS, KM, HOEHE)).toBe('km 24,4 · 2 757 m');
    expect(positionsText(99999, YS, KM, HOEHE)).toBe('km 24,4 · 2 757 m');
  });
  it('zählt dazwischen gleichmäßig hoch', () => {
    expect(positionsText(YS[4], YS, KM, HOEHE)).toBe('km 12,5 · 1 870 m');
    expect(positionsText(150, [100, 200], [0, 4], [1000, 2000])).toBe('km 2,0 · 1 500 m');
  });
});

describe('Nachlauf', () => {
  it('nähert sich dem Ziel und rastet ein', () => {
    expect(naehern(0, 100)).toBeCloseTo(14);
    expect(naehern(99.8, 100)).toBe(100);
    expect(naehern(-1, 100)).toBe(100); // erster Aufruf: sofort am Ziel
  });
});
