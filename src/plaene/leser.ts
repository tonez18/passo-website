// Liest eine .passoplan-Datei (Text) und macht daraus einen Plan für die Seite. Rein, ohne Dateizugriff.
// Vorlage ist allein das Dateiformat:
//   { format: 'passo-plan', version: 1,
//     plan: { name, description, weeks: [{ note, days: { '1'…'7': { ref } } }] },      Wochentag 1 = Montag
//     workouts: [{ ref, workout: { name, description, steps } }] }
//   Schritte: steady { seconds, power } · ramp { seconds, from, to, kind } · intervals { repeat, on, off } · free { seconds }
//   Leistung: { type: 'ftp', pct } oder { type: 'watts', watts }
// Was sich nicht lesen lässt, bricht mit einer deutschen Meldung ab, die Datei und Grund nennt.

export type Leistung = { art: 'ftp'; prozent: number } | { art: 'watt'; watt: number };
export type Schritt =
  | { art: 'gleich'; sekunden: number; leistung: Leistung }
  /** rolle: Einfahren oder Ausfahren, wenn die Datei die Rampe so kennzeichnet (kind: warmup / cooldown). */
  | { art: 'rampe'; sekunden: number; von: Leistung; bis: Leistung; rolle?: 'einfahren' | 'ausfahren' }
  | { art: 'intervalle'; wiederholungen: number; an: { sekunden: number; leistung: Leistung }; aus: { sekunden: number; leistung: Leistung } }
  | { art: 'frei'; sekunden: number };
export type Training = { name: string; beschreibung: string; schritte: Schritt[]; sekunden: number };
export type Wochentag = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type Woche = { nummer: number; notiz: string; minuten: number; tage: { wochentag: Wochentag; training: Training }[] };
export type Plan = {
  name: string;
  beschreibung: string;
  wochen: Woche[];
  einheitenJeWoche: { min: number; max: number };
  /** Stunden der leichtesten und der vollsten Woche, auf 0,5 gerundet. */
  stundenJeWoche: { min: number; max: number };
  /** false, sobald ein Schritt in festen Watt oder ein freier Schritt vorkommt. */
  nurFtp: boolean;
};

/** Fehler in einer Plandatei. Die Meldung ist deutsch und beginnt mit dem Dateinamen. */
export class PlanFehler extends Error {
  constructor(dateiname: string, grund: string) {
    super(`${dateiname}: ${grund}`);
    this.name = 'PlanFehler';
  }
}

export const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const;
const MAX_WOCHEN = 52;

type Roh = Record<string, unknown>;
const istObjekt = (w: unknown): w is Roh => typeof w === 'object' && w !== null && !Array.isArray(w);
const text = (w: unknown): string => (typeof w === 'string' ? w.trim() : '');

/** Sekunden eines Schritts; Intervalle zählen als Wiederholungen × (an + aus). */
export function schrittSekunden(s: Schritt): number {
  return s.art === 'intervalle' ? s.wiederholungen * (s.an.sekunden + s.aus.sekunden) : s.sekunden;
}

export function lesePlan(json: string, dateiname: string): Plan {
  const fehler = (grund: string) => new PlanFehler(dateiname, grund);

  let daten: unknown;
  const inhalt = json.charCodeAt(0) === 0xfeff ? json.slice(1) : json; // Bytereihenfolge-Marke am Dateianfang
  try {
    daten = JSON.parse(inhalt);
  } catch (e) {
    // Die Stelle steht in der (englischen) Meldung des JSON-Lesers; daraus wird Zeile und Spalte.
    const stelle = /position (\d+)/.exec(e instanceof Error ? e.message : '');
    const davor = stelle ? inhalt.slice(0, Number(stelle[1])).split('\n') : null;
    throw fehler('kein gültiges JSON' + (davor ? ` (Fehler in Zeile ${davor.length}, Spalte ${davor[davor.length - 1].length + 1})` : ''));
  }
  if (!istObjekt(daten) || daten.format !== 'passo-plan') throw fehler('keine Passo-Plandatei (das Feld „format“ ist nicht „passo-plan“)');
  if (daten.version !== 1) throw fehler(`Version ${String(daten.version)} wird nicht unterstützt (erwartet: 1)`);
  if (!istObjekt(daten.plan)) throw fehler('der Abschnitt „plan“ fehlt');
  const name = text(daten.plan.name);
  if (!name) throw fehler('der Plan hat keinen Namen');
  const wochenRoh = daten.plan.weeks;
  if (!Array.isArray(wochenRoh) || wochenRoh.length < 1 || wochenRoh.length > MAX_WOCHEN) {
    throw fehler(`ein Plan braucht 1 bis ${MAX_WOCHEN} Wochen (gefunden: ${Array.isArray(wochenRoh) ? wochenRoh.length : 0})`);
  }

  let nurFtp = true;

  function leistung(w: unknown, wo: string): Leistung {
    if (istObjekt(w) && w.type === 'ftp' && typeof w.pct === 'number' && Number.isFinite(w.pct) && w.pct >= 0) return { art: 'ftp', prozent: w.pct };
    if (istObjekt(w) && w.type === 'watts' && typeof w.watts === 'number' && Number.isFinite(w.watts) && w.watts >= 0) {
      nurFtp = false;
      return { art: 'watt', watt: w.watts };
    }
    throw fehler(`${wo}: Leistung fehlt oder ist unbekannt (erwartet: „ftp“ mit „pct“ oder „watts“ mit „watts“)`);
  }
  function dauer(w: unknown, wo: string): number {
    if (typeof w !== 'number' || !Number.isFinite(w) || w <= 0) throw fehler(`${wo}: Dauer in Sekunden fehlt oder ist nicht größer als 0`);
    return w;
  }
  function schritt(w: unknown, wo: string): Schritt {
    if (!istObjekt(w)) throw fehler(`${wo} ist kein Schritt`);
    switch (w.type) {
      case 'steady':
        return { art: 'gleich', sekunden: dauer(w.seconds, wo), leistung: leistung(w.power, wo) };
      case 'ramp': {
        const rampe: Schritt = { art: 'rampe', sekunden: dauer(w.seconds, wo), von: leistung(w.from, wo), bis: leistung(w.to, wo) };
        if (w.kind === 'warmup') rampe.rolle = 'einfahren';
        if (w.kind === 'cooldown') rampe.rolle = 'ausfahren';
        return rampe;
      }
      case 'intervals': {
        if (typeof w.repeat !== 'number' || !Number.isInteger(w.repeat) || w.repeat < 1) throw fehler(`${wo}: Zahl der Wiederholungen fehlt oder ist kleiner als 1`);
        if (!istObjekt(w.on) || !istObjekt(w.off)) throw fehler(`${wo}: Intervall ohne Belastung („on“) oder Pause („off“)`);
        return {
          art: 'intervalle',
          wiederholungen: w.repeat,
          an: { sekunden: dauer(w.on.seconds, wo + ', Belastung'), leistung: leistung(w.on.power, wo + ', Belastung') },
          aus: { sekunden: dauer(w.off.seconds, wo + ', Pause'), leistung: leistung(w.off.power, wo + ', Pause') },
        };
      }
      case 'free':
        nurFtp = false;
        return { art: 'frei', sekunden: dauer(w.seconds, wo) };
      default:
        throw fehler(`${wo}: unbekannter Schritt „${String(w.type)}“`);
    }
  }

  // Trainings nach ihrer Kennung; gelesen wird ein Training erst, wenn eine Woche es braucht.
  const trainingsRoh = new Map<string, unknown>();
  for (const eintrag of Array.isArray(daten.workouts) ? daten.workouts : []) {
    if (istObjekt(eintrag) && typeof eintrag.ref === 'string') trainingsRoh.set(eintrag.ref, eintrag.workout);
  }
  const gelesen = new Map<string, Training>();
  function training(ref: string): Training {
    const fertig = gelesen.get(ref);
    if (fertig) return fertig;
    const roh = trainingsRoh.get(ref);
    if (!istObjekt(roh)) throw fehler(`Training „${ref}“ fehlt`);
    const titel = text(roh.name) || ref;
    if (!Array.isArray(roh.steps) || roh.steps.length === 0) throw fehler(`Training „${titel}“ hat keine Schritte`);
    const schritte = roh.steps.map((s, i) => schritt(s, `Training „${titel}“, Schritt ${i + 1}`));
    const t: Training = { name: titel, beschreibung: text(roh.description), schritte, sekunden: schritte.reduce((summe, s) => summe + schrittSekunden(s), 0) };
    gelesen.set(ref, t);
    return t;
  }

  const wochen: Woche[] = wochenRoh.map((w, i) => {
    const nummer = i + 1;
    if (!istObjekt(w)) throw fehler(`Woche ${nummer} ist keine Woche`);
    const tageRoh = istObjekt(w.days) ? w.days : {};
    const tage = Object.keys(tageRoh).map((schluessel) => {
      const wochentag = Number(schluessel);
      if (!Number.isInteger(wochentag) || wochentag < 1 || wochentag > 7) throw fehler(`Woche ${nummer}: Wochentag „${schluessel}“ gibt es nicht (1 = Montag bis 7 = Sonntag)`);
      const tag = tageRoh[schluessel];
      if (!istObjekt(tag) || typeof tag.ref !== 'string') throw fehler(`Woche ${nummer}, ${WOCHENTAGE[wochentag - 1]}: der Verweis auf ein Training („ref“) fehlt`);
      return { wochentag: wochentag as Wochentag, training: training(tag.ref) };
    }).sort((a, b) => a.wochentag - b.wochentag);
    return { nummer, notiz: text(w.note), minuten: Math.round(tage.reduce((summe, t) => summe + t.training.sekunden, 0) / 60), tage };
  });

  const einheiten = wochen.map((w) => w.tage.length);
  const minuten = wochen.map((w) => w.minuten);
  const halbeStunden = (min: number) => Math.round(min / 30) / 2;
  return {
    name,
    beschreibung: text(daten.plan.description),
    wochen,
    einheitenJeWoche: { min: Math.min(...einheiten), max: Math.max(...einheiten) },
    stundenJeWoche: { min: halbeStunden(Math.min(...minuten)), max: halbeStunden(Math.max(...minuten)) },
    nurFtp,
  };
}
