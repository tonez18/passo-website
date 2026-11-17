// Rechnung der Route: Scroll-Fortschritt, Wegpunkte, km und Höhe im Kopf. Rein, ohne Zugriff auf die Seite, damit testbar.
// Die Seite ist das Kartenblatt einer Passfahrt; die Wegpunkte (Kartenangaben über den Abschnitten) liefern km und Höhe.

/** Der Fahrerpunkt steht beim Scrollen auf 58 % der Fensterhöhe. */
export const BLICKHOEHE = 0.58;

export function klemme(wert: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, wert));
}

/**
 * Stelle der Route (px ab Seitenanfang), die zum Scrollstand gehört; bleibt zwischen erstem und letztem Wegpunkt.
 * `seiteOben` ist der Abstand der Seite (#page) vom Dokumentanfang.
 */
export function routenStelle(scrollY: number, fensterHoehe: number, seiteOben: number, start: number, ziel: number): number {
  return klemme(scrollY + fensterHoehe * BLICKHOEHE - seiteOben, start, ziel);
}

/** Anteil der gefahrenen Route, 0 am Start, 1 auf der Passhöhe. */
export function fortschritt(y: number, start: number, ziel: number): number {
  return ziel > start ? klemme((y - start) / (ziel - start), 0, 1) : 0;
}

/** Ein Wegpunkt rastet ein, sobald der Fahrer ihn (auf 1 px genau) erreicht. */
export function erreicht(y: number, wegpunktY: number): boolean {
  return y >= wegpunktY - 1;
}

/** Abschnitt zwischen zwei Wegpunkten, in dem y liegt, und der Anteil darin (0…1). `ys` sind die Wegpunkte in px, aufsteigend. */
export function abschnittBei(y: number, ys: number[]): { abschnitt: number; anteil: number } {
  let letzter = 0;
  for (let i = 0; i < ys.length; i++) if (erreicht(y, ys[i])) letzter = i;
  const abschnitt = Math.max(0, Math.min(letzter, ys.length - 2));
  const laenge = ys[abschnitt + 1] - ys[abschnitt] || 1;
  return { abschnitt, anteil: klemme((y - ys[abschnitt]) / laenge, 0, 1) };
}

/** x der Spur auf Höhe y: lineare Interpolation zwischen den Stützpunkten (sy aufsteigend). */
export function xAufSpur(y: number, sy: number[], sx: number[]): number {
  let a = 0;
  let b = sy.length - 1;
  if (y <= sy[0]) return sx[0];
  if (y >= sy[b]) return sx[b];
  while (b - a > 1) {
    const m = (a + b) >> 1;
    if (sy[m] < y) a = m; else b = m;
  }
  const t = (y - sy[a]) / (sy[b] - sy[a] || 1);
  return sx[a] + (sx[b] - sx[a]) * t;
}

/** Ganze Zahl mit Tausenderlücke: 2757 → '2 757'. */
export function zahlText(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/** Kilometer mit einer Nachkommastelle und Komma: 3.14 → '3,1'. */
export function kmText(km: number): string {
  return km.toFixed(1).replace('.', ',');
}

/** Text der Positionsanzeige im Kopf, zwischen den Wegpunkten gleichmäßig hochgezählt: 'km 12,5 · 1 870 m'. */
export function positionsText(y: number, ys: number[], km: number[], hoehe: number[]): string {
  const { abschnitt: s, anteil: t } = abschnittBei(y, ys);
  return 'km ' + kmText(km[s] + (km[s + 1] - km[s]) * t) + ' · ' + zahlText(hoehe[s] + (hoehe[s + 1] - hoehe[s]) * t) + ' m';
}

/** Nachlauf des Fahrerpunkts: je Bild 14 % des Rests, unter 0,3 px rastet er ein. Ein negativer Stand heißt „noch nie gesetzt“. */
export function naehern(aktuell: number, ziel: number): number {
  if (aktuell < 0) return ziel;
  const neu = aktuell + (ziel - aktuell) * 0.14;
  return Math.abs(ziel - neu) < 0.3 ? ziel : neu;
}
