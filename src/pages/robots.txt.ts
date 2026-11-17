// robots.txt: gesperrt, solange „indexierbar“ in den Einstellungen false ist; sonst frei mit Verweis auf die Sitemap.
import type { APIRoute } from 'astro';
import { robotsText } from '../einstellungen';

export const GET: APIRoute = () => new Response(robotsText(), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
