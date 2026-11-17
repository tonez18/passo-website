// Ein gemeinsamer Takt für alle Bewegung (requestAnimationFrame). Er ruht, sobald kein Schritt mehr Bilder braucht
// oder der Tab verborgen ist; wecke() startet ihn wieder (Scrollen, Zeiger, Größenänderung).

/** Ein Schritt rechnet ein Bild und meldet, ob er ein weiteres braucht. */
type Schritt = (zeit: number) => boolean;

const schritte: Schritt[] = [];
let laeuft = false;

function bild(zeit: number): void {
  let weiter = false;
  for (const schritt of schritte) if (schritt(zeit)) weiter = true;
  if (weiter && !document.hidden) requestAnimationFrame(bild);
  else laeuft = false;
}

export function wecke(): void {
  if (laeuft || document.hidden || !schritte.length) return;
  laeuft = true;
  requestAnimationFrame(bild);
}

export function imTakt(schritt: Schritt): void {
  schritte.push(schritt);
  wecke();
}

document.addEventListener('visibilitychange', wecke);
