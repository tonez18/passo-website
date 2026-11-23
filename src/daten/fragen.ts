// Fragen und Antworten der Startseite. Dieselben Daten stehen als FAQPage (JSON-LD) im Kopf der Startseite.
// Antworten nur aus dem, was Specs und App belegen.
export interface Frage { frage: string; antwort: string }

import { einstellungen } from '../einstellungen';

const alleFragen: Frage[] = [
  { frage: 'Was kostet Passo?', antwort: 'Nichts. Es gibt kein Abo und keine Käufe in der App. Wenn dir Passo gefällt, kannst du freiwillig spenden.' },
  { frage: 'Brauche ich ein Konto?', antwort: 'Nein. Du lädst die App, verbindest deinen Trainer und fährst. Ein Strava-Konto brauchst du nur, wenn du Fahrten dorthin hochladen willst.' },
  { frage: 'Welche Trainer gehen?', antwort: 'Smart-Trainer, die über Bluetooth das Protokoll FTMS sprechen. Ob deiner das kann, steht im Datenblatt des Herstellers.' },
  { frage: 'Geht es ohne Zwift Ride?', antwort: 'Ja. Passo läuft mit jedem passenden Smart-Trainer, geschaltet wird dann am Bildschirm. Zwift Ride und Zwift Click sind eine Zugabe für das Schalten am Lenker.' },
  { frage: 'Wo liegen meine Fahrten?', antwort: 'Auf deinem Gerät. Du kannst sie als Datei sichern und zwischen deinen eigenen Geräten abgleichen. Zu Strava geht eine Fahrt nur, wenn du das einschaltest.' },
  { frage: 'Gibt es Passo für Android?', antwort: 'Derzeit nicht. Passo gibt es für iPhone, iPad und Apple TV.' },
  { frage: 'Was geht in der Beta noch nicht?', antwort: 'Passo läuft auf iPhone und iPad ab iOS 17, Android gibt es nicht. Routen importieren geht derzeit nur in Deutschland, Österreich und der Schweiz. Bei gesperrtem Bildschirm läuft eine Fahrt erst ab iOS 26 weiter. Strava lässt sich in der Beta nur mit wenigen Konten verbinden, der FIT-Export geht immer.' },
  { frage: 'Wie melde ich einen Fehler?', antwort: 'Am schnellsten mit einem Screenshot, den du in TestFlight teilst. Oder per E-Mail an die Adresse im Impressum. Nenne bitte deinen Trainer und deinen Controller.' },
  { frage: 'Wie kommt ein Plan in die App?', antwort: 'Lade die Plandatei (.passoplan) von der Planseite und öffne sie mit Passo. Dann wählst du deine Trainingstage, und die Einheiten stehen im Kalender.' },
];

/** Die Frage nach Plänen nur, solange die Webseite Pläne zeigt. */
export const fragen: Frage[] = alleFragen.filter((f) => einstellungen.plaeneZeigen || !f.frage.includes('Plan'));
