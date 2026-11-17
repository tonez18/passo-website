// Trainingsprofil: Hinweis zu Schritt, Dauer und % FTP am Balken. Mit Maus beim Überfahren, am Telefon per Tipp;
// beim Scrollen verschwindet er. Ohne JavaScript zeigt der Browser stattdessen den <title> des Balkens.
export function starteHinweis(): void {
  const hinweis = document.getElementById('tip');
  if (!hinweis) return;
  // Den eingebauten Hinweis des Browsers abschalten, sonst stünden zwei übereinander.
  document.querySelectorAll('.wprof title').forEach((t) => t.remove());
  let aktiv: Element | null = null;

  const weg = (): void => {
    if (!aktiv) return;
    aktiv.classList.remove('hot');
    aktiv = null;
    hinweis.classList.remove('on');
  };
  const zeige = (e: PointerEvent): void => {
    const balken = e.target instanceof Element ? e.target.closest('.wprof [data-tip]') : null;
    if (!balken) { weg(); return; }
    if (balken !== aktiv) {
      aktiv?.classList.remove('hot');
      aktiv = balken;
      balken.classList.add('hot');
      hinweis.textContent = balken.getAttribute('data-tip');
      hinweis.classList.add('on');
    }
    const r = balken.getBoundingClientRect();
    const breite = hinweis.offsetWidth;
    const x = Math.max(8, Math.min(window.innerWidth - breite - 8, e.clientX - breite / 2));
    let y = r.top - hinweis.offsetHeight - 10;
    if (y < 70) y = r.bottom + 10; // unter dem Kopf ist kein Platz: Hinweis unter den Balken
    hinweis.style.transform = 'translate3d(' + x.toFixed(0) + 'px,' + y.toFixed(0) + 'px,0)';
  };
  document.addEventListener('pointermove', zeige);
  document.addEventListener('pointerdown', zeige);
  window.addEventListener('scroll', weg, { passive: true });
}
