// Hero-Karte: Ein Punkt fährt die Passstraße hinauf. Ohne Maus neigen sich die Geräte mit dem Scrollen.
// Läuft nur, solange der Hero im Bild ist.
import { imTakt, wecke } from './takt';
import { klemme } from './route';

/** Ob der Hero gerade im Bild ist (auch für die Zeigereffekte). */
export const held = { imBild: true };

const STUETZEN = 700;

export function starteKarte(fein: boolean): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { held.imBild = e[e.length - 1].isIntersecting; if (held.imBild) wecke(); }).observe(hero);
  }
  const fahrer = document.getElementById('roadRider');
  const strasse = document.getElementById('road') as SVGPathElement | null;
  const geraete = document.getElementById('devsIn');
  const punkte: [number, number][] = [];
  if (fahrer && strasse && typeof strasse.getTotalLength === 'function') {
    const laenge = strasse.getTotalLength();
    for (let i = 0; i <= STUETZEN; i++) { const p = strasse.getPointAtLength((laenge * i) / STUETZEN); punkte.push([p.x, p.y]); }
  }

  imTakt((zeit) => {
    if (!held.imBild) return false;
    if (punkte.length) {
      // eine Auffahrt dauert knapp zwei Minuten
      const u = ((zeit * 0.0000085) % 1) * STUETZEN;
      const i = Math.floor(u);
      const a = punkte[i];
      const b = punkte[Math.min(STUETZEN, i + 1)];
      const m = u - i;
      fahrer!.setAttribute('transform', 'translate(' + (a[0] + (b[0] - a[0]) * m).toFixed(1) + ' ' + (a[1] + (b[1] - a[1]) * m).toFixed(1) + ')');
    }
    if (!fein && geraete) {
      const s = klemme(window.scrollY / (hero.offsetHeight || 1), 0, 1);
      geraete.style.transform = 'rotateX(' + (s * 10).toFixed(2) + 'deg) rotateY(' + (-6 + s * 12).toFixed(2) + 'deg)';
    }
    return true;
  });
}
