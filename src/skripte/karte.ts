// Hero-Karte: Ein Punkt fährt die Passstraße hinauf. Ohne Maus neigen sich die Geräte mit dem Scrollen.
// Läuft nur, solange der Hero im Bild ist.
import { imTakt, wecke } from './takt';
import { klemme } from './route';

/** Ob der Hero gerade im Bild ist (auch für die Zeigereffekte). */
export const held = { imBild: true };

export function starteKarte(fein: boolean): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((e) => { held.imBild = e[e.length - 1].isIntersecting; if (held.imBild) wecke(); }).observe(hero);
  }
  const fahrer = document.getElementById('roadRider');
  const strasse = document.getElementById('road') as SVGPathElement | null;
  const geraete = document.getElementById('devsIn');
  // Die Straße wird nicht vorab ausgemessen (das kostet beim Laden spürbar Zeit), sondern je Bild an einer Stelle.
  const laenge = fahrer && strasse && typeof strasse.getTotalLength === 'function' ? strasse.getTotalLength() : 0;
  let stelle = -1;

  imTakt((zeit) => {
    if (!held.imBild) return false;
    if (laenge) {
      // eine Auffahrt dauert knapp zwei Minuten; neu gesetzt wird ab einem halben Kartenpunkt Weg
      const neu = ((zeit * 0.0000085) % 1) * laenge;
      if (Math.abs(neu - stelle) >= 0.5) {
        stelle = neu;
        const p = strasse!.getPointAtLength(neu);
        fahrer!.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
      }
    }
    if (!fein && geraete) {
      const s = klemme(window.scrollY / (hero.offsetHeight || 1), 0, 1);
      geraete.style.transform = 'rotateX(' + (s * 10).toFixed(2) + 'deg) rotateY(' + (-6 + s * 12).toFixed(2) + 'deg)';
    }
    return true;
  });
}
