// Design-Umschalter: wechselt zwischen dunkel und hell und merkt sich die Wahl im Browser (kein Cookie).
const wurzel = document.documentElement;
const knopf = document.getElementById('th');

function beschrifte(): void {
  knopf?.setAttribute('aria-label', wurzel.getAttribute('data-thema') === 'dunkel' ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln');
}

if (knopf) {
  beschrifte();
  knopf.addEventListener('click', () => {
    const neu = wurzel.getAttribute('data-thema') === 'dunkel' ? 'hell' : 'dunkel';
    wurzel.setAttribute('data-thema', neu);
    try { localStorage.setItem('passo-thema', neu); } catch { /* privates Fenster: Wahl gilt bis zum Neuladen */ }
    beschrifte();
  });
}

export {};
