// Download einer Plandatei: /plaene/<adresse>.passoplan, Inhalt unverändert wie im Ordner plaene/.
import type { APIRoute, GetStaticPaths } from 'astro';
import { sammlePlaene, type Eintrag } from '../../plaene/sammlung';

export const getStaticPaths: GetStaticPaths = async () =>
  (await sammlePlaene()).map((eintrag) => ({ params: { slug: eintrag.slug }, props: { eintrag } }));

export const GET: APIRoute = ({ props }) =>
  new Response((props.eintrag as Eintrag).roh, { headers: { 'Content-Type': 'application/json' } });
