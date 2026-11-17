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

/**
 * Legt die Spur durch die Wegpunkte: senkrechte Stücke, vor jedem Wegpunkt ein Bogen (höchstens `bogen` px hoch) auf dessen
 * Seite; `halb` ist der halbe Durchmesser des Wegpunkt-Zeichens. Liefert den SVG-Pfad und Stützpunkte (sy aufsteigend, sx dazu),
 * damit der Fahrerpunkt der Spur folgt, ohne dass der Browser den Pfad ausmessen muss.
 */
export function legeSpur(punkte: number[][], halb: number, bogen: number): { d: string; sy: number[]; sx: number[] } {
  const sy: number[] = [];
  const sx: number[] = [];
  const stuetze = (x: number, y: number): void => {
    if (!sy.length || y > sy[sy.length - 1]) { sy.push(y); sx.push(x); } else sx[sx.length - 1] = x;
  };
  let d = 'M' + punkte[0][0] + ' ' + punkte[0][1].toFixed(1);
  stuetze(punkte[0][0], punkte[0][1]);
  for (let i = 1; i < punkte.length; i++) {
    const a = punkte[i - 1];
    const b = punkte[i];
    const ende = b[1] - halb;
    const g = Math.max(0, Math.min(bogen, ende - a[1] - halb - 6));
    const anfang = ende - g;
    const y1 = anfang + g * 0.78;
    const y2 = ende - g * 0.78;
    d += 'L' + a[0] + ' ' + anfang.toFixed(1) + 'C' + a[0] + ' ' + y1.toFixed(1) + ' ' + b[0] + ' ' + y2.toFixed(1) + ' ' + b[0] + ' ' + ende.toFixed(1) + 'L' + b[0] + ' ' + b[1].toFixed(1);
    stuetze(a[0], anfang);
    if (g > 0 && a[0] !== b[0]) {
      const teile = 24;
      for (let k = 1; k < teile; k++) {
        const t = k / teile;
        const u = 1 - t;
        // kubische Bézierkurve; x hat die Kontrollpunkte a, a, b, b
        stuetze(a[0] * (u * u * u + 3 * u * u * t) + b[0] * (3 * u * t * t + t * t * t), u * u * u * anfang + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * ende);
      }
    }
    stuetze(b[0], ende);
    stuetze(b[0], b[1]);
  }
  return { d, sy, sx };
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
