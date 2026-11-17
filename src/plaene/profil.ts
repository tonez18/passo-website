// Macht aus den Schritten eines Trainings die Balken für das Trainingsprofil.
// Höhe = % FTP (150 % ist die volle Höhe), Farbe = Zone. Feste Watt und freie Abschnitte haben keinen Bezug zur FTP:
// Sie sind graue Balken in halber Höhe, beschriftet mit dem Wattwert bzw. „frei“.
import type { Leistung, Training } from './leser';

export type Balken = {
  /** Anteil an der Dauer des Trainings, 0…1. */
  anteil: number;
  /** 0…1; 150 % FTP = 1. */
  hoehe: number;
  /** Zone 1–7; null = grau (feste Watt oder frei). */
  zone: number | null;
  /** Text für den Hinweis am Balken. */
  titel: string;
  /** Leistung in % FTP (bei Rampen die Mitte der Stufe); fehlt bei grauen Balken. */
  prozent?: number;
  /** Folgestufe einer Rampe: schließt ohne Lücke an den Balken davor an. */
  anschluss?: boolean;
};

/** Obergrenzen der Zonen 1–6 in % FTP; darüber liegt Zone 7. */
const GRENZEN = [55, 75, 90, 105, 120, 150];
const VOLL = 150;
const GRAU_HOEHE = 0.5;

export function zone(prozent: number): number {
  const i = GRENZEN.findIndex((grenze) => prozent <= grenze);
  return i < 0 ? 7 : i + 1;
}

const zahl = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** 45 → '45 s', 600 → '10 min', 90 → '1:30 min'. */
export function dauerText(sekunden: number): string {
  const s = Math.round(sekunden);
  if (s < 60) return s + ' s';
  return s % 60 === 0 ? s / 60 + ' min' : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0') + ' min';
}

const wert = (l: Leistung) => (l.art === 'ftp' ? zahl(l.prozent) + ' % FTP' : zahl(l.watt) + ' W');
const hoehe = (prozent: number) => Math.min(VOLL, Math.max(0, prozent)) / VOLL;

export function profil(t: Training): Balken[] {
  const gesamt = t.sekunden || 1;
  const balken: Balken[] = [];
  const einer = (sekunden: number, l: Leistung | null, titel: string) => {
    balken.push(l && l.art === 'ftp'
      ? { anteil: sekunden / gesamt, hoehe: hoehe(l.prozent), zone: zone(l.prozent), titel, prozent: l.prozent }
      : { anteil: sekunden / gesamt, hoehe: GRAU_HOEHE, zone: null, titel });
  };

  for (const s of t.schritte) {
    if (s.art === 'gleich') {
      einer(s.sekunden, s.leistung, (s.leistung.art === 'ftp' ? `Zone ${zone(s.leistung.prozent)} · ` : '') + `${dauerText(s.sekunden)} · ${wert(s.leistung)}`);
    } else if (s.art === 'frei') {
      einer(s.sekunden, null, `frei · ${dauerText(s.sekunden)}`);
    } else if (s.art === 'rampe') {
      const name = s.rolle === 'einfahren' ? 'Einfahren' : s.rolle === 'ausfahren' ? 'Ausfahren' : 'Rampe';
      if (s.von.art === 'ftp' && s.bis.art === 'ftp') {
        // je 5 Prozentpunkte eine Stufe, mindestens 2 und höchstens 6
        const a = s.von.prozent;
        const b = s.bis.prozent;
        const stufen = Math.max(2, Math.min(6, Math.round(Math.abs(b - a) / 5)));
        const titel = `${name} · ${dauerText(s.sekunden)} · ${zahl(a)}–${zahl(b)} % FTP`;
        for (let k = 0; k < stufen; k++) {
          const mitte = a + ((b - a) * (k + 0.5)) / stufen;
          balken.push({ anteil: s.sekunden / stufen / gesamt, hoehe: hoehe(mitte), zone: zone(mitte), titel, prozent: mitte, ...(k > 0 && { anschluss: true }) });
        }
      } else {
        const spanne = s.von.art === 'watt' && s.bis.art === 'watt' ? `${zahl(s.von.watt)}–${zahl(s.bis.watt)} W` : `${wert(s.von)} bis ${wert(s.bis)}`;
        einer(s.sekunden, null, `${name} · ${dauerText(s.sekunden)} · ${spanne}`);
      }
    } else {
      for (let k = 1; k <= s.wiederholungen; k++) {
        einer(s.an.sekunden, s.an.leistung, `Intervall ${k}/${s.wiederholungen} · ${dauerText(s.an.sekunden)} · ${wert(s.an.leistung)}`);
        einer(s.aus.sekunden, s.aus.leistung, `Pause ${k}/${s.wiederholungen} · ${dauerText(s.aus.sekunden)} · ${wert(s.aus.leistung)}`);
      }
    }
  }
  return balken;
}

/** Kleinster und größter Wert der Balken in % FTP (gerundet); null, wenn kein Balken einen Bezug zur FTP hat. */
export function spanneProzent(balken: Balken[]): { min: number; max: number } | null {
  const werte = balken.flatMap((b) => (b.prozent === undefined ? [] : [b.prozent]));
  return werte.length ? { min: Math.round(Math.min(...werte)), max: Math.round(Math.max(...werte)) } : null;
}

/** Die Schritte als ein Satz für Vorleser und Tastatur: Titel der Balken mit „; “ verbunden.
 *  Die Stufen einer Rampe zählen einmal; gleiche Schritte in Folge werden zu „3 × …“. */
export function schritteText(balken: Balken[]): string {
  const schritte: { titel: string; mal: number }[] = [];
  for (const b of balken) {
    if (b.anschluss) continue;
    const letzter = schritte[schritte.length - 1];
    if (letzter && letzter.titel === b.titel) letzter.mal++;
    else schritte.push({ titel: b.titel, mal: 1 });
  }
  return schritte.map((s) => (s.mal > 1 ? s.mal + ' × ' : '') + s.titel).join('; ');
}
