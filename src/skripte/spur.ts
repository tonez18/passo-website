// Route durch die Seite: verbindet die Wegpunkte (.leg-Zeilen) zu einer Spur, die sich beim Scrollen zeichnet.
// Der Fahrerpunkt folgt, Wegpunkte rasten ein, im Kopf laufen km und Höhe mit.
// data-spur="links" am #page hält alle Wegpunkte auf der linken Spur; sonst wechselt die Route die Seite.
import { imTakt, wecke } from './takt';
import { erreicht, legeSpur, naehern, positionsText, routenStelle, xAufSpur } from './route';

export function starteSpur(ruhig: boolean): void {
  const wurzel = document.documentElement;
  const seite = document.getElementById('page');
  const grund = document.querySelector<SVGPathElement>('.rt-base path');
  const spur = document.querySelector<SVGPathElement>('.rt-live path');
  const fenster = document.querySelector<HTMLElement>('.rt-clip');
  const innen = document.querySelector<HTMLElement>('.rt-in');
  const fahrer = document.querySelector<HTMLElement>('.rider');
  const anzeige = document.getElementById('posT');
  if (!seite || !grund || !spur || !fenster || !innen || !fahrer) return;
  const zeilen = Array.from(seite.querySelectorAll<HTMLElement>('.leg'));
  if (zeilen.length < 2) return;

  const marken = zeilen.map((z) => z.querySelector('.wp'));
  const eineSpur = seite.dataset.spur === 'links';
  const km = zeilen.map((z) => parseFloat(z.dataset.km ?? ''));
  const hoehe = zeilen.map((z) => parseFloat(z.dataset.hoehe ?? ''));
  const mitWerten = km.every(Number.isFinite) && hoehe.every(Number.isFinite);
  const orte = zeilen.map((z) => z.dataset.pos ?? '');
  const rand = seite.querySelector<HTMLElement>('.wrap');
  if (!rand) return;

  let hoeheSeite = 0;
  let ys: number[] = [];
  let sy: number[] = [];
  let sx: number[] = [];
  let neuOrdnen = true;
  let stand = -1;
  let gezeichnet = -1;
  let text = '';
  wurzel.classList.add('route-on');

  /** Misst die Wegpunkte aus und legt den Pfad: senkrechte Stücke, vor jedem Wegpunkt ein Bogen auf die andere Seite. */
  function ordne(): void {
    const kasten = seite!.getBoundingClientRect();
    const breite = seite!.clientWidth;
    hoeheSeite = seite!.offsetHeight;
    const links = rand!.getBoundingClientRect().left - kasten.left + parseFloat(getComputedStyle(rand!).paddingLeft);
    const bahn = Math.max(13, links / 2);
    const bogen = Math.max(40, parseFloat(getComputedStyle(wurzel).getPropertyValue('--gap')) - 44);
    const punkte = zeilen.map((z, i) => {
      const r = z.getBoundingClientRect();
      const x = i % 2 && !eineSpur ? breite - bahn : bahn;
      z.style.setProperty('--wx', x - (r.left - kasten.left) + 'px');
      return [x, r.top - kasten.top + r.height / 2];
    });
    const halb = window.innerWidth < 700 ? 12 : window.innerWidth < 1080 ? 16 : 20;
    const gelegt = legeSpur(punkte, halb, bogen);
    const d = gelegt.d;
    sy = gelegt.sy;
    sx = gelegt.sx;
    for (const p of [grund!, spur!]) {
      p.setAttribute('d', d);
      p.parentElement!.setAttribute('width', String(breite));
      p.parentElement!.setAttribute('height', String(hoeheSeite));
    }
    ys = punkte.map((p) => p[1]);
    gezeichnet = -1;
  }

  function zeichne(y: number): void {
    if (Math.abs(y - gezeichnet) < 0.2) return;
    gezeichnet = y;
    fenster!.style.transform = 'translate3d(0,' + (y - hoeheSeite).toFixed(1) + 'px,0)';
    innen!.style.transform = 'translate3d(0,' + (hoeheSeite - y).toFixed(1) + 'px,0)';
    fahrer!.style.transform = 'translate3d(' + xAufSpur(y, sy, sx).toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    let letzter = 0;
    for (let i = 0; i < ys.length; i++) {
      const an = erreicht(y, ys[i]);
      const marke = marken[i];
      if (marke && marke.classList.contains('on') !== an) marke.classList.toggle('on', an);
      if (an) letzter = i;
    }
    if (!anzeige) return;
    const neu = mitWerten ? positionsText(y, ys, km, hoehe) : orte[letzter] || text;
    if (neu && neu !== text) { text = neu; anzeige.textContent = neu; }
  }

  function neu(): void { neuOrdnen = true; wecke(); }

  imTakt(() => {
    if (neuOrdnen) { neuOrdnen = false; ordne(); }
    const ende = ys[ys.length - 1];
    // Mit „Bewegung reduzieren“ steht die Route fertig da.
    const ziel = ruhig ? ende : routenStelle(window.scrollY, window.innerHeight, seite.getBoundingClientRect().top + window.scrollY, ys[0], ende);
    stand = ruhig ? ziel : naehern(stand, ziel);
    zeichne(stand);
    return stand !== ziel;
  });

  if ('ResizeObserver' in window) new ResizeObserver(neu).observe(seite);
  window.addEventListener('resize', neu);
  window.addEventListener('load', neu);
  window.addEventListener('scroll', wecke, { passive: true });
  document.fonts?.ready.then(neu);
}
