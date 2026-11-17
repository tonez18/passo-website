// Alle Links, Adressen und Schalter der Webseite an einer Stelle.
// Ein leerer Link heißt: Der Knopf zeigt „Bald verfügbar“ und ist nicht klickbar.

export const einstellungen = {
  /** Adresse ohne Pfad und ohne Schrägstrich am Ende. */
  seitenUrl: 'https://tonez18.github.io',
  /** Unterpfad mit Schrägstrich vorn und hinten; mit eigener Domain '/'. */
  basisPfad: '/passo-website/',
  /** false hält Suchmaschinen fern (bis die Domain steht). */
  indexierbar: false,
  /** Öffentlicher TestFlight-Link. */
  testflightUrl: 'https://testflight.apple.com/join/rGhp1TFk',
  /** App-Store-Link; ist er gesetzt, ersetzt er den TestFlight-Link. */
  appStoreUrl: '',
  /** Ko-fi-Seite für Spenden. */
  kofiUrl: 'https://ko-fi.com/passocycling',
  kontaktEmail: 'hallo@domi-speh.de',
  /** firma ist freiwillig und steht unter dem Namen. */
  impressum: { name: 'Dominik Speh', firma: 'DMNK new media', strasse: 'Obere Straße 46a', ort: '76698 Ubstadt' },
};

export type Einstellungen = typeof einstellungen;

/** Interne Adresse unter Beachtung des Unterpfads: pfad('/plaene/') → '/passo-website/plaene/'. */
export function pfad(p: string, basis: string = einstellungen.basisPfad): string {
  const b = basis.endsWith('/') ? basis : basis + '/';
  return b + p.replace(/^\/+/, '');
}

/** Vollständige Adresse für Suchmaschinen und Teilbilder. */
export function absolut(p: string): string {
  return einstellungen.seitenUrl.replace(/\/+$/, '') + pfad(p);
}

/** Beschriftung und Ziel des Download-Knopfs. */
export function ladeKnopf(e: Einstellungen = einstellungen): { text: string; url: string | null; hinweis: string | null } {
  if (e.appStoreUrl) return { text: 'Im App Store laden', url: e.appStoreUrl, hinweis: null };
  if (e.testflightUrl) return { text: 'Beta laden', url: e.testflightUrl, hinweis: 'Beta über TestFlight' };
  return { text: 'Bald verfügbar', url: null, hinweis: null };
}

/**
 * Namen der leeren Pflichtfelder. Solange hier etwas steht, darf die Seite nicht veröffentlicht werden.
 * Der Download-Link ist keine Pflicht: Ohne ihn zeigt der Knopf „Bald verfügbar“.
 */
export function fehlendeAngaben(e: Einstellungen = einstellungen): string[] {
  const f: string[] = [];
  if (!e.kofiUrl) f.push('kofiUrl');
  if (!e.kontaktEmail) f.push('kontaktEmail');
  if (!e.impressum.name) f.push('impressum.name');
  if (!e.impressum.strasse) f.push('impressum.strasse');
  if (!e.impressum.ort) f.push('impressum.ort');
  return f;
}

/** Angabe für die Rechtstexte; ein leeres Feld wird zum sichtbaren Platzhalter „[fehlt: Name]“. */
export function oderFehlt(wert: string, name: string): string {
  return wert.trim() || `[fehlt: ${name}]`;
}

/** Inhalt der robots.txt: gesperrt, solange die Seite nicht indexierbar ist; sonst frei mit Verweis auf die Sitemap. */
export function robotsText(e: Einstellungen = einstellungen): string {
  if (!e.indexierbar) return 'User-agent: *\nDisallow: /\n';
  const sitemap = e.seitenUrl.replace(/\/+$/, '') + pfad('/sitemap-index.xml', e.basisPfad);
  return `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
}
