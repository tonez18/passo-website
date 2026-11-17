import { describe, expect, it } from 'vitest';
import { werte, kurz, skala, zahlwort, textBloecke, lastPunkte } from '../src/plaene/darstellung';
import type { Plan } from '../src/plaene/leser';

const plan = (wochen: number, einheiten: [number, number], stunden: [number, number]): Plan => ({
  name: 'Probe', beschreibung: '', nurFtp: true,
  wochen: Array.from({ length: wochen }, (_, i) => ({ nummer: i + 1, notiz: '', minuten: 100, tage: [] })),
  einheitenJeWoche: { min: einheiten[0], max: einheiten[1] },
  stundenJeWoche: { min: stunden[0], max: stunden[1] },
});

describe('die drei Werte eines Plans', () => {
  it('stehen wie im Mockup', () => {
    expect(werte(plan(8, [3, 3], [2, 4.5]))).toEqual(['8 Wochen', '3 Einheiten', '2–4,5 h je Woche']);
    expect(werte(plan(6, [2, 4], [2.5, 2.5]))).toEqual(['6 Wochen', '2–4 Einheiten', '2,5 h je Woche']);
  });
  it('kennen die Einzahl', () => {
    expect(werte(plan(1, [1, 1], [1, 1]))).toEqual(['1 Woche', '1 Einheit', '1 h je Woche']);
  });
});

describe('gekürzte Beschreibung', () => {
  it('lässt kurze Texte stehen', () => expect(kurz('Kurz und gut.')).toBe('Kurz und gut.'));
  it('kürzt am Wortende und hängt „…“ an', () => {
    const lang = 'Acht Wochen Sweet Spot und Schwelle: Rampentest am Anfang und am Ende, samstags lang locker, Woche 4 zur Erholung und noch mehr.';
    const k = kurz(lang);
    expect(k.length).toBeLessThanOrEqual(120);
    expect(k.endsWith(' …')).toBe(true);
    expect(lang.startsWith(k.slice(0, -2))).toBe(true);
    expect(kurz('eins zwei, drei', 11)).toBe('eins zwei …');
  });
});

describe('Skala der Wochenlast', () => {
  it('ist mindestens 300 min und sonst auf 50 aufgerundet', () => {
    expect(skala([[105, 155], [150, 285]])).toBe(300);
    expect(skala([[100, 301]])).toBe(350);
    expect(skala([])).toBe(300);
  });
  it('legt die Punkte in die Zeichenfläche 300 × 96', () => {
    expect(lastPunkte([175, 218, 215, 165, 236, 223, 255, 115], 300)).toEqual([[12, 43.2], [51.4, 33.1], [90.9, 33.8], [130.3, 45.5], [169.7, 28.9], [209.1, 32], [248.6, 24.5], [288, 57.2]]);
    expect(lastPunkte([150], 300)).toEqual([[150, 49]]);
  });
});

describe('Zahlwort', () => {
  it('schreibt bis zwölf aus', () => {
    expect(zahlwort(1)).toBe('Eine');
    expect(zahlwort(5)).toBe('Fünf');
    expect(zahlwort(12)).toBe('Zwölf');
    expect(zahlwort(13)).toBe('13');
  });
});

describe('Begleittext', () => {
  it('kennt Überschriften, Absätze und Listen', () => {
    expect(textBloecke('## Für wen\n\nFür alle,\ndie gern fahren.\n\n- eins\n- zwei\n\nSchluss.')).toEqual([
      { art: 'titel', text: 'Für wen' },
      { art: 'absatz', text: 'Für alle, die gern fahren.' },
      { art: 'liste', punkte: ['eins', 'zwei'] },
      { art: 'absatz', text: 'Schluss.' },
    ]);
  });
});
