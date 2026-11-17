// Menü am Telefon: Menüknopf klappt die Links auf; Escape und ein Klick auf einen Link schließen.
const nav = document.getElementById('nav');
const knopf = document.getElementById('menuB');

function menue(offen: boolean): void {
  nav!.classList.toggle('open', offen);
  knopf!.setAttribute('aria-expanded', offen ? 'true' : 'false');
}

if (nav && knopf) {
  knopf.addEventListener('click', () => menue(!nav.classList.contains('open')));
  nav.addEventListener('click', (e) => { if ((e.target as Element).closest('a')) menue(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menue(false); });
}

export {};
