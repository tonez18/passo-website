// Kleine Helfer für die Darstellung der Pläne: die drei Werte, gekürzte Beschreibung, Geometrie der Wochenlast, Begleittext.
import type { Plan } from './leser';

const komma = (n: number) => String(n).replace('.', ',');
const spanne = (min: number, max: number) => (min === max ? komma(min) : komma(min) + '–' + komma(max));

/** Die drei Werte eines Plans: ['8 Wochen', '3 Einheiten', '2–4,5 h je Woche']. */
export function werte(p: Plan): [string, string, string] {
  const e = p.einheitenJeWoche;
  return [
    p.wochen.length + (p.wochen.length === 1 ? ' Woche' : ' Wochen'),
    spanne(e.min, e.max) + (e.max === 1 ? ' Einheit' : ' Einheiten'),
    spanne(p.stundenJeWoche.min, p.stundenJeWoche.max) + ' h je Woche',
  ];
}

/** Kürzt am Wortende auf höchstens `max` Zeichen und hängt „ …“ an. */
export function kurz(text: string, max = 118): string {
  if (text.length <= max) return text;
  const anfang = text.slice(0, max);
  return anfang.slice(0, anfang.lastIndexOf(' ')).replace(/[,:;.]$/, '') + ' …';
}

/** Oberes Ende der Wochenlast-Profile in Minuten, gemeinsam für alle Pläne: mindestens 300, sonst auf 50 aufgerundet. */
export function skala(minutenJePlan: number[][]): number {
  return Math.max(300, Math.ceil(Math.max(0, ...minutenJePlan.flat()) / 50) * 50);
}

const r1 = (n: number) => Number(n.toFixed(1));

/** Punkte der Wochenlast in der Zeichenfläche 300 × 96: x von 12 bis 288, y = 84 (0 min) bis 14 (max). */
export function lastPunkte(minuten: number[], max: number): [number, number][] {
  const n = minuten.length;
  return minuten.map((m, i) => [r1(n > 1 ? 12 + (i * 276) / (n - 1) : 150), r1(84 - (m / max) * 70)]);
}

const ZAHLWORTE = ['Null', 'Eine', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf'];
/** 5 → 'Fünf' (weibliche Form für „Touren“); ab 13 die Ziffern. */
export function zahlwort(n: number): string {
  return ZAHLWORTE[n] ?? String(n);
}

export type TextBlock = { art: 'titel'; text: string } | { art: 'absatz'; text: string } | { art: 'liste'; punkte: string[] };

/** Begleittext einer Planseite: Absätze, Überschriften mit „## “ und Listen mit „- “. Mehr kann er bewusst nicht. */
export function textBloecke(text: string): TextBlock[] {
  const bloecke: TextBlock[] = [];
  for (const stueck of text.split(/\r?\n\s*\r?\n/)) {
    const zeilen = stueck.split(/\r?\n/).map((z) => z.trim()).filter(Boolean);
    if (!zeilen.length) continue;
    if (/^#{1,6}\s/.test(zeilen[0])) {
      bloecke.push({ art: 'titel', text: zeilen[0].replace(/^#+\s*/, '') });
      zeilen.shift();
      if (!zeilen.length) continue;
    }
    if (zeilen.every((z) => /^[-*]\s/.test(z))) bloecke.push({ art: 'liste', punkte: zeilen.map((z) => z.replace(/^[-*]\s+/, '')) });
    else bloecke.push({ art: 'absatz', text: zeilen.join(' ') });
  }
  return bloecke;
}
