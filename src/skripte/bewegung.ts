// Einstieg für alle Bewegung der Seite.
// - Einblenden: .rv-Teile und die Hero-Geräte bekommen .in, sobald sie ins Bild kommen.
// - Route mit Fahrerpunkt (spur.ts), Hero-Karte (karte.ts), Reaktionen auf die Maus (zeiger.ts).
// Mit „Bewegung reduzieren“ steht alles im Endzustand: kein .anim am <html> (Vorabskript), die Route ist fertig gezeichnet,
// Hero-Karte und Zeigereffekte starten nicht. Ohne Maus (Touch) entfallen die Zeigereffekte.
import { starteSpur } from './spur';
import { starteKarte } from './karte';
import { starteZeiger } from './zeiger';

const wurzel = document.documentElement;
const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fein = matchMedia('(hover: hover) and (pointer: fine)').matches;
if (fein && !ruhig) wurzel.classList.add('fine');

const teile = document.querySelectorAll('.rv,.devs');
if (wurzel.classList.contains('anim') && 'IntersectionObserver' in window) {
  const waechter = new IntersectionObserver((eintraege) => {
    for (const e of eintraege) if (e.isIntersecting) { e.target.classList.add('in'); waechter.unobserve(e.target); }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  teile.forEach((el) => waechter.observe(el));
} else {
  teile.forEach((el) => el.classList.add('in'));
}

starteSpur(ruhig);
if (!ruhig) {
  starteKarte(fein);
  if (fein) starteZeiger();
}
