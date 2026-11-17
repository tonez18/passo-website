import { describe, expect, it } from 'vitest';
import { einstellungen, pfad, absolut, ladeKnopf, fehlendeAngaben, oderFehlt, robotsText } from '../src/einstellungen';

const leer: typeof einstellungen = {
  ...einstellungen,
  testflightUrl: '',
  appStoreUrl: '',
  kofiUrl: '',
  kontaktEmail: '',
  impressum: { name: '', firma: '', strasse: '', ort: '' },
};

describe('pfad', () => {
  it('setzt den Unterpfad davor', () => {
    expect(pfad('/plaene/', '/passo-website/')).toBe('/passo-website/plaene/');
    expect(pfad('/', '/')).toBe('/');
    expect(pfad('plaene/x.passoplan', '/a/')).toBe('/a/plaene/x.passoplan');
  });
  it('nimmt ohne Angabe den Unterpfad aus den Einstellungen', () => {
    expect(pfad('/plaene/')).toBe(einstellungen.basisPfad + 'plaene/');
    expect(absolut('/plaene/')).toBe(einstellungen.seitenUrl + einstellungen.basisPfad + 'plaene/');
  });
});

describe('ladeKnopf', () => {
  it('zeigt die Beta, solange es nur TestFlight gibt', () => {
    expect(ladeKnopf({ ...leer, testflightUrl: 'https://t' })).toEqual({ text: 'Beta laden', url: 'https://t', hinweis: 'Beta über TestFlight' });
  });
  it('zieht den App Store vor', () => {
    const k = ladeKnopf({ ...leer, testflightUrl: 'https://t', appStoreUrl: 'https://a' });
    expect(k.text).toBe('Im App Store laden');
    expect(k.url).toBe('https://a');
    expect(k.hinweis).toBeNull();
  });
  it('ist ohne Link kein Link', () => {
    expect(ladeKnopf(leer)).toEqual({ text: 'Bald verfügbar', url: null, hinweis: null });
  });
});

describe('fehlendeAngaben', () => {
  it('nennt leere Pflichtfelder beim Namen', () => {
    const f = fehlendeAngaben(leer);
    expect(f).toContain('impressum.name');
    expect(f).toContain('impressum.strasse');
    expect(f).toContain('impressum.ort');
    expect(f).toContain('kontaktEmail');
    expect(f).toContain('kofiUrl');
    expect(f).not.toContain('testflightUrl');
  });
  it('ist leer, wenn alles da ist', () => {
    expect(fehlendeAngaben({ ...leer, kofiUrl: 'https://k', kontaktEmail: 'a@b.de', impressum: { name: 'N', firma: '', strasse: 'S', ort: 'O' } })).toEqual([]);
  });
});

describe('oderFehlt', () => {
  it('zeigt leere Angaben als sichtbaren Platzhalter', () => {
    expect(oderFehlt('', 'Name')).toBe('[fehlt: Name]');
    expect(oderFehlt('   ', 'Ort')).toBe('[fehlt: Ort]');
    expect(oderFehlt('Musterweg 1', 'Straße')).toBe('Musterweg 1');
  });
});

describe('robotsText', () => {
  it('sperrt alles und nennt keine Sitemap, solange die Seite nicht indexierbar ist', () => {
    const t = robotsText({ ...leer, indexierbar: false });
    expect(t).toContain('Disallow: /');
    expect(t).not.toContain('Sitemap');
    expect(t).not.toContain('Allow: /');
  });
  it('gibt alles frei und nennt die Sitemap mit Unterpfad', () => {
    const t = robotsText({ ...leer, indexierbar: true, seitenUrl: 'https://beispiel.de', basisPfad: '/unter/' });
    expect(t).toContain('Allow: /');
    expect(t).not.toContain('Disallow');
    expect(t).toContain('Sitemap: https://beispiel.de/unter/sitemap-index.xml');
  });
});
