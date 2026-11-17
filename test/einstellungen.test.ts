import { describe, expect, it } from 'vitest';
import { einstellungen, pfad, absolut, ladeKnopf, fehlendeAngaben } from '../src/einstellungen';

const leer: typeof einstellungen = {
  ...einstellungen,
  testflightUrl: '',
  appStoreUrl: '',
  kofiUrl: '',
  kontaktEmail: '',
  impressum: { name: '', strasse: '', ort: '' },
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
    expect(f).toContain('testflightUrl');
  });
  it('ist leer, wenn alles da ist', () => {
    expect(fehlendeAngaben({ ...leer, appStoreUrl: 'https://a', kofiUrl: 'https://k', kontaktEmail: 'a@b.de', impressum: { name: 'N', strasse: 'S', ort: 'O' } })).toEqual([]);
  });
});
