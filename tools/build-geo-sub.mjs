#!/usr/bin/env node
// 시·구 지도 생성 (창원·청주·이천 + 그 구). 원본: tools/_provinces.json, _muni.json (gitignore)
//   {slug}_only.svg / {slug}_up.svg (도에서 강조) · {gucode}_only.svg / {gucode}_up.svg (시에서 강조)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'assets', 'maps', 'geo');
const prov = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', '_provinces.json'), 'utf8')).features;
const muni = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', '_muni.json'), 'utf8')).features;
const P = Object.fromEntries(prov.map(f => [f.properties.code, f]));
const M = Object.fromEntries(muni.map(f => [f.properties.code, f]));

const K = Math.cos(36 * Math.PI / 180);
const px = ([lon, lat]) => [lon * K, lat];
const ringsOf = g => g.type === 'Polygon' ? g.coordinates : g.type === 'MultiPolygon' ? g.coordinates.flat() : [];
function bbox(list) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9;
  for (const f of list) for (const ring of ringsOf(f.geometry)) for (const p of ring) { const [x, y] = px(p); if (x < a) a = x; if (x > c) c = x; if (y < b) b = y; if (y > d) d = y; }
  return { minx: a, miny: b, maxx: c, maxy: d }; }
function mkProj(bb, maxDim, pad) { const sx = bb.maxx - bb.minx, sy = bb.maxy - bb.miny; const s = maxDim / Math.max(sx, sy);
  return { proj: ([x, y]) => [pad + (x - bb.minx) * s, pad + (bb.maxy - y) * s], W: sx * s + 2 * pad, H: sy * s + 2 * pad }; }
function pathFor(f, proj, eps) { let d = '';
  for (const ring of ringsOf(f.geometry)) { const pts = ring.map(c => proj(px(c))); let last = null, kept = [];
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; if (i === 0 || i === pts.length - 1 || !last || Math.hypot(p[0] - last[0], p[1] - last[1]) > eps) { kept.push(p); last = p; } }
    if (kept.length < 3) continue; kept.forEach((p, i) => { d += (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }); d += 'Z'; }
  return d; }
const svg = (W, H, inner) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W.toFixed(0)} ${H.toFixed(0)}" preserveAspectRatio="xMidYMid meet">${inner}</svg>\n`;
const w = (name, s) => fs.writeFileSync(path.join(OUT, name), s);
const BASE = '#2b3450', LINE = '#4a5675', GOLD = '#ffcf5a', GLINE = '#b8860b', FILL = '#9aa3b8';

const CITIES = {
  changwon: { sido: '38', gus: ['38111', '38112', '38113', '38114', '38115'] },
  cheongju: { sido: '33', gus: ['33041', '33042', '33043', '33044'] },
  icheon:   { sido: '31', parts: ['31210'] },
};
let n = 0;
for (const [slug, c] of Object.entries(CITIES)) {
  const parts = (c.gus || c.parts).map(code => M[code]);
  // 시 단독 (구 경계 실선 포함)
  { const { proj, W, H } = mkProj(bbox(parts), 480, 10);
    w(`${slug}_only.svg`, svg(W, H, parts.map(f => `<path d="${pathFor(f, proj, 0.5)}" fill="${FILL}" stroke="#71809a" stroke-width="0.8" fill-rule="evenodd"/>`).join(''))); n++; }
  // 도에서 시 강조
  { const provF = P[c.sido]; const { proj, W, H } = mkProj(bbox([provF]), 540, 12);
    const base = `<path d="${pathFor(provF, proj, 0.7)}" fill="${BASE}" stroke="${LINE}" stroke-width="0.8" fill-rule="evenodd"/>`;
    const gold = parts.map(f => `<path d="${pathFor(f, proj, 0.6)}" fill="${GOLD}" stroke="${GLINE}" stroke-width="0.8" fill-rule="evenodd"/>`).join('');
    w(`${slug}_up.svg`, svg(W, H, base + gold)); n++; }
  // 구
  for (const g of (c.gus || [])) {
    const gf = M[g];
    { const { proj, W, H } = mkProj(bbox([gf]), 460, 10);
      w(`${g}_only.svg`, svg(W, H, `<path d="${pathFor(gf, proj, 0.4)}" fill="${FILL}" fill-rule="evenodd"/>`)); n++; }
    { const { proj, W, H } = mkProj(bbox(parts), 500, 12);
      const others = parts.filter(f => f !== gf).map(f => `<path d="${pathFor(f, proj, 0.6)}" fill="${BASE}" stroke="${LINE}" stroke-width="0.8" fill-rule="evenodd"/>`).join('');
      const gold = `<path d="${pathFor(gf, proj, 0.5)}" fill="${GOLD}" stroke="${GLINE}" stroke-width="0.9" fill-rule="evenodd"/>`;
      w(`${g}_up.svg`, svg(W, H, others + gold)); n++; }
  }
}
console.log(`시·구 지도 생성 완료: ${n}개 SVG → assets/maps/geo/`);
