// Erzeugt die Höhenlinien der Hero-Karte und schreibt sie nach src/bausteine/Hoehenlinien.astro.
// Aufruf: node werkzeug/gen-topo.cjs   (nur nötig, wenn das Gelände geändert wird)
const fs = require('fs'), path = require('path');
const W = 1600, H = 1000, S = 10;
const G = [ // x, y, Höhe (m über Grund), Sigma
  [1130, 95, 2200, 250], [640, 130, 1750, 215], [1750, 300, 2200, 250], [80, 130, 1250, 220],
  [1050, 640, 520, 170], [420, 520, 260, 200], [1250, 980, 700, 200],
];
const elev = (x, y) => {
  let h = 900;
  for (const [gx, gy, a, s] of G) h += a * Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / (2 * s * s));
  return h + 55 * Math.sin(x / 115 + 1) * Math.cos(y / 95) + 38 * Math.sin((x + y) / 72) + 22 * Math.cos((x - 2 * y) / 60);
};
const nx = Math.floor(W / S) + 5, ny = Math.floor(H / S) + 5, X0 = -2 * S, Y0 = -2 * S;
const g = []; for (let j = 0; j < ny; j++) { g.push([]); for (let i = 0; i < nx; i++) g[j].push(elev(X0 + i * S, Y0 + j * S)); }
function contour(level) {
  const segs = [];
  const P = (i, j, e) => { // Punkt auf Kante e der Zelle (0 oben,1 rechts,2 unten,3 links) samt Schlüssel
    let a, b, x, y, k;
    if (e === 0) { a = g[j][i]; b = g[j][i + 1]; x = i + (level - a) / (b - a); y = j; k = 'h' + i + '_' + j; }
    else if (e === 2) { a = g[j + 1][i]; b = g[j + 1][i + 1]; x = i + (level - a) / (b - a); y = j + 1; k = 'h' + i + '_' + (j + 1); }
    else if (e === 3) { a = g[j][i]; b = g[j + 1][i]; x = i; y = j + (level - a) / (b - a); k = 'v' + i + '_' + j; }
    else { a = g[j][i + 1]; b = g[j + 1][i + 1]; x = i + 1; y = j + (level - a) / (b - a); k = 'v' + (i + 1) + '_' + j; }
    return { x: X0 + x * S, y: Y0 + y * S, k };
  };
  const T = { 1: [[3, 2]], 2: [[2, 1]], 3: [[3, 1]], 4: [[0, 1]], 5: [[0, 3], [2, 1]], 6: [[0, 2]], 7: [[0, 3]], 8: [[0, 3]], 9: [[0, 2]], 10: [[0, 1], [3, 2]], 11: [[0, 1]], 12: [[3, 1]], 13: [[2, 1]], 14: [[3, 2]] };
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const c = (g[j][i] > level ? 8 : 0) | (g[j][i + 1] > level ? 4 : 0) | (g[j + 1][i + 1] > level ? 2 : 0) | (g[j + 1][i] > level ? 1 : 0);
    for (const [a, b] of T[c] || []) segs.push([P(i, j, a), P(i, j, b)]);
  }
  const by = new Map(); segs.forEach((s, n) => s.forEach(p => { if (!by.has(p.k)) by.set(p.k, []); by.get(p.k).push(n); }));
  const used = new Set(), chains = [];
  const walk = (n, p) => { const pts = [p]; let cur = n, at = p; for (;;) { used.add(cur); const s = segs[cur]; const nxt = s[0].k === at.k ? s[1] : s[0]; pts.push(nxt); const o = (by.get(nxt.k) || []).find(m => !used.has(m)); if (o === undefined) break; cur = o; at = nxt; } return pts; };
  segs.forEach((s, n) => { if (used.has(n)) return; const a = walk(n, s[0]); const o = (by.get(s[0].k) || []).find(m => !used.has(m)); if (o !== undefined) { const b = walk(o, s[0]); b.reverse(); b.pop(); chains.push(b.concat(a)); } else chains.push(a); });
  return chains.filter(c => c.length > 6);
}
const r = v => Math.round(v);
function d(pts) {
  const closed = pts[0].k === pts[pts.length - 1].k;
  const q = pts.filter((_, i) => i % 2 === 0 || i === pts.length - 1);
  let s = `M${r(q[0].x)} ${r(q[0].y)}`;
  for (let i = 1; i < q.length - 1; i++) s += `Q${r(q[i].x)} ${r(q[i].y)} ${r((q[i].x + q[i + 1].x) / 2)} ${r((q[i].y + q[i + 1].y) / 2)}`;
  s += `L${r(q[q.length - 1].x)} ${r(q[q.length - 1].y)}` + (closed ? 'Z' : '');
  return s;
}
const layers = [[], [], []], nums = [];
for (let lv = 1000; lv <= 3100; lv += 100) {
  const idx = lv % 500 === 0, L = lv < 1700 ? 0 : lv < 2400 ? 1 : 2;
  const cs = contour(lv); if (!cs.length) continue;
  layers[L].push(`<path${idx ? ' class="ix"' : ''} d="${cs.map(d).join('')}"/>`);
  if (idx) {
    const c = cs.reduce((a, b) => (b.length > a.length ? b : a));
    for (const f of c.length > 260 ? [0.22, 0.7] : [0.4]) {
      const i = Math.floor(c.length * f), p = c[i], p2 = c[Math.min(c.length - 1, i + 4)];
      if (p.x < 60 || p.x > W - 60 || p.y < 40 || p.y > H - 40) continue;
      let a = Math.atan2(p2.y - p.y, p2.x - p.x) * 180 / Math.PI; if (a > 90) a -= 180; if (a < -90) a += 180;
      nums.push(`<text class="tn" data-l="${L}" transform="translate(${r(p.x)} ${r(p.y)}) rotate(${r(a)})" dy="3.5">${lv}</text>`);
    }
  }
}
// Passstraße: Talstück, Kehren, Passhöhe. Kehren als Wellenzug mit waagrechten Tangenten.
function serp(x1, x2, y0, dy, n, startLeft) {
  let s = '', left = startLeft, y = y0;
  for (let i = 0; i < n; i++) { const xa = left ? x1 : x2, xb = left ? x2 : x1, t = (xb - xa) * 0.25; s += `C${r(xa + (left ? -1 : 1) * 46)} ${r(y - dy * 0.04)} ${r(xa + (left ? -1 : 1) * 46)} ${r(y - dy)} ${r(xa + t)} ${r(y - dy)}L${r(xb - t)} ${r(y - dy)}`; y -= dy; left = !left; }
  return s;
}
let road = 'M-30 952C90 915 190 968 320 925S500 900 560 930L600 930';
road += serp(580, 800, 930, 30, 4, false);
road += 'C900 810 1000 800 1100 850S1300 930 1390 920';
road += serp(1425, 1535, 920, 52, 13, false);
road += 'C1440 244 1436 196 1470 160';
const pass = [1470, 160];
const out = [
  '<svg class="topo-defs" width="0" height="0" aria-hidden="true" focusable="false"><defs>',
  ...layers.map((l, i) => `<g id="tl${i}" fill="none">${l.join('')}</g>`),
  `<path id="road" fill="none" d="${road}"/>`,
  `<g id="tnum">${nums.join('')}</g>`,
  '</defs></svg>',
].join('\n');
const f = path.join(__dirname, '../src/bausteine/Hoehenlinien.astro');
const kopf = '---\n// Erzeugt von werkzeug/gen-topo.cjs. Nicht von Hand ändern; Gelände dort anpassen und neu erzeugen.\n// Höhenlinien in drei Ebenen (tl0–tl2), Passstraße (road) und Höhenzahlen (tnum) als <defs> für die Hero-Karte und die Kartenausschnitte.\n---\n';
fs.writeFileSync(f, kopf + out + '\n');
console.log('Höhenlinien:', (out.length / 1024).toFixed(1), 'kB');
console.log('Gipfel:', G.slice(0, 4).map(([x, y]) => `${x},${y} = ${r(elev(x, y))} m`).join(' | '), '| Pass', pass.join(','), '=', r(elev(...pass)), 'm');
