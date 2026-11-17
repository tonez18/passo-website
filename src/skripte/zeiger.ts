// Reaktionen auf die Maus. Wird nur gestartet, wenn das Gerät einen feinen Zeiger hat und Bewegung erlaubt ist.
// Hero: Linien leuchten um den Zeiger in Teal, drei Linien-Ebenen verschieben sich gegeneinander, die Geräte neigen sich.
// Karten: Lichtfleck folgt dem Zeiger, das Gerät neigt sich. Wochenlast: Marke zeigt Woche, Minuten und Notiz.
import { imTakt, wecke } from './takt';
import { held } from './karte';

const LICHT = 230; // halber Durchmesser des Lichtkreises (.spot ist 460 px breit)

function starteHero(): void {
  const hero = document.querySelector<HTMLElement>('.hero');
  const topo = hero?.querySelector<HTMLElement>('.topo');
  const buehne = topo?.querySelector<HTMLElement>('.stage');
  const licht = topo?.querySelector<HTMLElement>('.spot');
  const lichtInnen = licht?.querySelector<HTMLElement>('.spot-in');
  const geraete = document.getElementById('devsIn');
  if (!hero || !topo || !buehne || !licht || !lichtInnen) return;

  // Im Lichtkreis liegt dieselbe Karte noch einmal in Teal, ohne Beschriftung und Straße.
  const kopie = buehne.cloneNode(true) as HTMLElement;
  kopie.removeAttribute('id');
  kopie.querySelector('.tx')?.remove();
  kopie.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
  lichtInnen.appendChild(kopie);
  const ebenen = Array.from(topo.querySelectorAll<SVGElement>('.tl')).map((el) => ({ el, k: Number(el.dataset.k) }));

  // x, y: Zeiger im Hero von −1 bis 1 (gedämpft); px, py: in Pixeln; t…: Zielwerte
  const z = { x: 0, y: 0, tx: 0, ty: 0, px: 0, py: 0, tpx: 0, tpy: 0, drin: false };
  let kasten: DOMRect | null = null;
  const messe = (): void => {
    kasten = null;
    lichtInnen.style.width = topo.clientWidth + 'px';
    lichtInnen.style.height = topo.clientHeight + 'px';
  };
  messe();
  if ('ResizeObserver' in window) new ResizeObserver(messe).observe(topo);
  window.addEventListener('scroll', () => { kasten = null; }, { passive: true });

  hero.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    kasten = kasten || hero.getBoundingClientRect();
    z.tpx = e.clientX - kasten.left;
    z.tpy = e.clientY - kasten.top;
    z.tx = (z.tpx / kasten.width) * 2 - 1;
    z.ty = (z.tpy / kasten.height) * 2 - 1;
    if (!z.drin) { z.drin = true; z.px = z.tpx; z.py = z.tpy; licht.classList.add('on'); }
    wecke();
  });
  hero.addEventListener('pointerleave', () => { z.drin = false; z.tx = 0; z.ty = 0; licht.classList.remove('on'); });

  imTakt(() => {
    if (!held.imBild) return false;
    z.x += (z.tx - z.x) * 0.08;
    z.y += (z.ty - z.y) * 0.08;
    z.px += (z.tpx - z.px) * 0.16;
    z.py += (z.tpy - z.py) * 0.16;
    for (const { el, k } of ebenen) el.style.transform = 'translate3d(' + (-z.x * (3 + k * 7)).toFixed(2) + 'px,' + (-z.y * (2 + k * 6)).toFixed(2) + 'px,0)';
    licht.style.transform = 'translate3d(' + (z.px - LICHT).toFixed(1) + 'px,' + (z.py - LICHT).toFixed(1) + 'px,0)';
    lichtInnen.style.transform = 'translate3d(' + (LICHT - z.px).toFixed(1) + 'px,' + (LICHT - z.py).toFixed(1) + 'px,0)';
    if (geraete) geraete.style.transform = 'rotateY(' + (z.x * 7).toFixed(2) + 'deg) rotateX(' + (-z.y * 5).toFixed(2) + 'deg)';
    return false; // der Takt läuft über die Hero-Karte, solange der Hero im Bild ist
  });
}

interface Karte { licht: HTMLElement | null; geraet: HTMLElement | null; x: number; y: number; rx: number; ry: number; zrx: number; zry: number; kasten: DOMRect | null }

function starteKarten(): void {
  const karten: Karte[] = [];
  let aktiv: Karte | null = null;
  document.querySelectorAll<HTMLElement>('.fc,.plan').forEach((el) => {
    const k: Karte = { licht: el.querySelector('.glow'), geraet: el.querySelector('.win .dev'), x: 0, y: 0, rx: 0, ry: 0, zrx: 0, zry: 0, kasten: null };
    el.addEventListener('pointerenter', () => { k.kasten = el.getBoundingClientRect(); aktiv = k; wecke(); });
    el.addEventListener('pointermove', (e) => {
      if (!k.kasten) k.kasten = el.getBoundingClientRect();
      k.x = e.clientX - k.kasten.left;
      k.y = e.clientY - k.kasten.top;
      k.zry = (k.x / k.kasten.width - 0.5) * 16;
      k.zrx = -(k.y / k.kasten.height - 0.5) * 10;
      aktiv = k;
      wecke();
    });
    el.addEventListener('pointerleave', () => { k.zrx = 0; k.zry = 0; k.kasten = null; if (aktiv === k) aktiv = null; wecke(); });
    karten.push(k);
  });
  if (!karten.length) return;

  imTakt(() => {
    let weiter = false;
    for (const k of karten) {
      const ruht = Math.abs(k.rx - k.zrx) < 0.01 && Math.abs(k.ry - k.zry) < 0.01;
      if (k !== aktiv && ruht) continue;
      k.rx += (k.zrx - k.rx) * 0.14;
      k.ry += (k.zry - k.ry) * 0.14;
      if (k.licht && k === aktiv) k.licht.style.transform = 'translate3d(' + k.x.toFixed(1) + 'px,' + k.y.toFixed(1) + 'px,0)';
      if (k.geraet) k.geraet.style.transform = 'rotateY(' + k.ry.toFixed(2) + 'deg) rotateX(' + k.rx.toFixed(2) + 'deg)';
      if (!ruht) weiter = true;
    }
    return weiter;
  });
}

/** Wochenlast-Profil: Die Marke folgt dem Zeiger (Geometrie: viewBox 300 × 96, Punkte bei x = 12 … 288). */
function starteProfile(): void {
  document.querySelectorAll<HTMLElement>('.prof').forEach((profil) => {
    const minuten = (profil.dataset.w ?? '').split(',').map(Number);
    const notizen = (profil.dataset.n ?? '').split('|');
    const marke = profil.querySelector<HTMLElement>('.mk');
    const ausgabe = profil.parentElement?.querySelector<HTMLElement>('.prof-r b');
    if (minuten.length < 2 || !marke || !ausgabe) return;
    const ruhetext = ausgabe.textContent;
    const max = Number(profil.dataset.max) || 300;
    profil.addEventListener('pointermove', (e) => {
      const r = profil.getBoundingClientRect();
      const anteil = (e.clientX - r.left) / r.width;
      const i = Math.max(0, Math.min(minuten.length - 1, Math.round(((anteil * 300 - 12) / 276) * (minuten.length - 1))));
      const x = ((12 + (i * 276) / (minuten.length - 1)) / 300) * r.width;
      const y = ((84 - (minuten[i] / max) * 70) / 96) * r.height;
      marke.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
      ausgabe.textContent = 'Woche ' + (i + 1) + ' · ' + minuten[i] + ' min' + (notizen[i] ? ' · ' + notizen[i] : '');
    });
    profil.addEventListener('pointerleave', () => { ausgabe.textContent = ruhetext; });
  });
}

export function starteZeiger(): void {
  starteHero();
  starteKarten();
  starteProfile();
}
