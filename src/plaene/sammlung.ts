// Liest den Ordner plaene/: jede .passoplan-Datei wird ein Eintrag mit Adresse, Rang, Plan und unverändertem Inhalt.
// Adresse und Reihenfolge kommen aus dem Dateinamen: „02-ftp-verbessern.passoplan“ → /plaene/ftp-verbessern/ an zweiter Stelle.
// Eine Begleitdatei <adresse>.md daneben liefert Fließtext für die Planseite; ihre erste Zeile „titel: …“ den Suchmaschinen-Titel.
import fs from 'node:fs/promises';
import path from 'node:path';
import { lesePlan, PlanFehler, type Plan } from './leser';

export type Eintrag = { slug: string; rang: number | null; dateiname: string; plan: Plan; roh: string; text?: string; seoTitel?: string };

const ENDUNG = '.passoplan';
const UMLAUTE: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' };

export function ausDateiname(d: string): { slug: string; rang: number | null } {
  const stamm = d.endsWith(ENDUNG) ? d.slice(0, -ENDUNG.length) : d;
  const nummer = /^(\d+)-(.*)$/.exec(stamm);
  const name = nummer ? nummer[2] : stamm;
  const slug = name
    .toLowerCase()
    .replace(/[äöüß]/g, (z) => UMLAUTE[z])
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new PlanFehler(d, 'aus dem Dateinamen lässt sich keine Adresse bilden (Buchstaben oder Ziffern fehlen)');
  return { slug, rang: nummer ? Number(nummer[1]) : null };
}

/** Der Ordner plaene/ im Webseiten-Repo (der Bau läuft immer vom Repo-Ordner aus). */
const standardOrdner = () => path.resolve(process.cwd(), 'plaene');

export async function sammlePlaene(ordner: string = standardOrdner()): Promise<Eintrag[]> {
  let namen: string[];
  try {
    namen = await fs.readdir(ordner);
  } catch {
    return [];
  }
  const eintraege: Eintrag[] = [];
  for (const dateiname of namen.filter((n) => n.endsWith(ENDUNG)).sort()) {
    const { slug, rang } = ausDateiname(dateiname.normalize('NFC'));
    const doppelt = eintraege.find((e) => e.slug === slug);
    if (doppelt) throw new PlanFehler(doppelt.dateiname, `und ${dateiname} ergeben dieselbe Adresse „${slug}“; eine der beiden Dateien umbenennen`);
    const roh = await fs.readFile(path.join(ordner, dateiname), 'utf8');
    const eintrag: Eintrag = { slug, rang, dateiname, plan: lesePlan(roh, dateiname), roh };
    const begleit = await fs.readFile(path.join(ordner, slug + '.md'), 'utf8').catch(() => null);
    if (begleit !== null) {
      const titel = /^titel:[ \t]*(.*)(?:\r?\n|$)/i.exec(begleit);
      if (titel && titel[1].trim()) eintrag.seoTitel = titel[1].trim();
      const text = (titel ? begleit.slice(titel[0].length) : begleit).trim();
      if (text) eintrag.text = text;
    }
    eintraege.push(eintrag);
  }
  // nummerierte nach Rang, danach die übrigen nach Name
  return eintraege.sort((a, b) => {
    if (a.rang !== null && b.rang !== null) return a.rang - b.rang || a.dateiname.localeCompare(b.dateiname, 'de');
    if (a.rang !== null) return -1;
    if (b.rang !== null) return 1;
    return a.plan.name.localeCompare(b.plan.name, 'de') || a.dateiname.localeCompare(b.dateiname, 'de');
  });
}
